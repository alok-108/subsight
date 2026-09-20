'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/lib/context';
import { api } from '@/lib/api';
import { UploadResponse, DetectionJob } from '@/lib/types';
import { UploadDropzone } from '@/components/UploadDropzone';
import { HorizontalPipeline, ActivePipelineChecklist } from '@/components/PipelineSteps';
import { Card } from '@/components/Card';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  FileCheck,
  AlertTriangle,
  Play,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Table as TableIcon,
} from 'lucide-react';

export default function UploadPage() {
  const { userId } = useApp();
  const queryClient = useQueryClient();

  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobData, setJobData] = useState<DetectionJob | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<any>(null);

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Poll analyze job every 400ms
  useEffect(() => {
    if (!jobId || !analyzing) return;

    pollRef.current = setInterval(async () => {
      try {
        const job = await api.getAnalyzeStatus(jobId);
        setJobData(job);

        if (job.status === 'done') {
          setAnalyzing(false);
          if (pollRef.current) clearInterval(pollRef.current);
          toast.success('Detection pipeline completed successfully!');
          await queryClient.invalidateQueries();

          // Fetch fresh summary
          const dash = await api.getDashboard(userId);
          setAnalysisSummary(dash);
        } else if (job.status === 'failed') {
          setAnalyzing(false);
          if (pollRef.current) clearInterval(pollRef.current);
          toast.error(job.error || 'Pipeline execution failed');
        }
      } catch (err: any) {
        setAnalyzing(false);
        if (pollRef.current) clearInterval(pollRef.current);
        toast.error('Failed to poll analysis status');
      }
    }, 400);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobId, analyzing, userId, queryClient]);

  const handleFileSelect = async (file: File) => {
    setUploading(true);
    setUploadResult(null);
    setJobData(null);
    setAnalysisSummary(null);

    try {
      const res = await api.uploadFile(file, userId);
      setUploadResult(res);
      toast.success(`Successfully extracted ${res.parsed} transactions from ${file.name}`);
      await queryClient.invalidateQueries();
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!uploadResult) return;
    setAnalyzing(true);
    setAnalysisSummary(null);

    try {
      const res = await api.startAnalyze(uploadResult.upload_id, userId);
      setJobId(res.job_id);
    } catch (err: any) {
      setAnalyzing(false);
      toast.error(err.message || 'Failed to start analysis');
    }
  };

  const currentPipelineIdx = analysisSummary ? 5 : analyzing ? 3 : uploadResult ? 2 : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Upload & Analyze Statement
        </h1>
        <p className="mt-1 text-sm text-muted">
          Ingest raw bank statements (CSV or PDF) to run the deterministic detection engine.
        </p>
      </div>

      {/* Horizontal Pipeline Stepper */}
      <Card className="p-4 bg-surface/50">
        <HorizontalPipeline currentStep={currentPipelineIdx} />
      </Card>

      {/* Upload Dropzone */}
      <UploadDropzone onFileSelect={handleFileSelect} uploading={uploading} />

      {/* Extracted File Preview Table & Warnings */}
      {uploadResult && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-ink text-base">
                  {uploadResult.parsed} transactions detected
                </h3>
                <p className="text-xs text-muted">
                  Ready for recurrence pattern clustering & normalization
                </p>
              </div>
            </div>

            <button
              onClick={handleStartAnalysis}
              disabled={analyzing}
              className="btn-purple inline-flex items-center gap-2 px-5 py-2.5 text-sm shadow-md"
            >
              <Play className={`h-4 w-4 ${analyzing ? 'animate-spin' : ''}`} />
              <span>{analyzing ? 'Analyzing Engine Running...' : 'Analyze Transactions'}</span>
            </button>
          </div>

          {/* Warnings callout if any rows skipped */}
          {uploadResult.warnings && uploadResult.warnings.length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span>{uploadResult.warnings.length} warning(s) during parsing (skipped rows)</span>
              </div>
              <ul className="mt-2 list-disc list-inside space-y-1 pl-1 text-[11px] text-amber-700 dark:text-amber-400">
                {uploadResult.warnings.slice(0, 5).map((w, idx) => (
                  <li key={idx}>{w}</li>
                ))}
                {uploadResult.warnings.length > 5 && (
                  <li>...and {uploadResult.warnings.length - 5} more</li>
                )}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          <Card className="p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-line bg-canvas/50">
              <span className="text-xs font-semibold text-ink flex items-center gap-2">
                <TableIcon className="h-4 w-4 text-purple-600" />
                Statement Preview (First 25 Rows)
              </span>
              <span className="text-xs text-muted">Showing {uploadResult.preview.length} of {uploadResult.parsed}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-canvas border-b border-line text-muted uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Merchant</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {uploadResult.preview.map((row, idx) => (
                    <tr key={idx} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap text-muted">{formatDate(row.date)}</td>
                      <td className="px-4 py-2.5 font-medium text-ink whitespace-nowrap">{row.merchant}</td>
                      <td className="px-4 py-2.5 text-muted font-mono text-[11px] max-w-xs truncate">{row.description}</td>
                      <td className="px-4 py-2.5 text-muted whitespace-nowrap">{row.category || 'General'}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-ink whitespace-nowrap tabular-nums">
                        {formatCurrency(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Live Pipeline Stepper during Analysis */}
      {jobData && (
        <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
          <ActivePipelineChecklist
            steps={jobData.steps}
            onRetry={handleStartAnalysis}
            isFailed={jobData.status === 'failed'}
          />

          {/* Completion Summary Panel */}
          {analysisSummary && (
            <Card className="border-purple-200 bg-purple-50/30 dark:border-purple-900 dark:bg-purple-950/20 p-6 space-y-5 animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-sm">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">Analysis Completed</h3>
                  <p className="text-xs text-muted">
                    Engine detected recurring payment schedules and established confidence scores.
                  </p>
                </div>
              </div>

              {/* Metrics Highlights */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 pt-2">
                <div className="subsight-card p-4">
                  <span className="text-xs font-semibold text-muted uppercase">Subscriptions Found</span>
                  <div className="mt-1 text-2xl font-bold text-ink tabular-nums">
                    {analysisSummary.active_count}
                  </div>
                </div>
                <div className="subsight-card p-4">
                  <span className="text-xs font-semibold text-muted uppercase">Total Monthly Recurring</span>
                  <div className="mt-1 text-2xl font-bold text-ink tabular-nums">
                    {formatCurrency(analysisSummary.total_monthly)}
                  </div>
                </div>
                <div className="subsight-card p-4">
                  <span className="text-xs font-semibold text-muted uppercase">Flagged for Review</span>
                  <div className="mt-1 text-2xl font-bold text-amber-600 tabular-nums">
                    {analysisSummary.forgotten_count}
                  </div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-line">
                <Link
                  href="/subscriptions"
                  className="btn-purple inline-flex items-center gap-2 px-4 py-2 text-xs"
                >
                  <span>View Subscriptions</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                {analysisSummary.forgotten_count > 0 && (
                  <Link
                    href="/forgotten"
                    className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                  >
                    <span>Review Potentially Forgotten ({analysisSummary.forgotten_count})</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
                <Link
                  href="/insights"
                  className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-xs"
                >
                  <span>View Financial Insights</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
