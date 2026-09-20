'use client';

import React from 'react';
import { PipelineStep } from '@/lib/types';
import { CheckCircle2, Loader2, Circle, AlertCircle, RefreshCw } from 'lucide-react';

interface HorizontalPipelineProps {
  currentStep?: number; // 0 to 5
}

const STATIC_STEPS = [
  'UPLOAD',
  'EXTRACT',
  'CLEAN',
  'ANALYZE',
  'DETECT',
  'INSIGHTS',
];

export function HorizontalPipeline({ currentStep = 0 }: HorizontalPipelineProps) {
  return (
    <div className="w-full overflow-x-auto py-2">
      <div className="flex items-center justify-between min-w-[540px]">
        {STATIC_STEPS.map((label, idx) => {
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;

          return (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                    isDone
                      ? 'bg-purple-600 text-white'
                      : isCurrent
                      ? 'border-2 border-purple-600 bg-purple-50 text-purple-700 font-bold dark:bg-purple-950 dark:text-purple-300'
                      : 'border border-line bg-surface text-muted'
                  }`}
                >
                  {isDone ? '✓' : idx + 1}
                </div>
                <span
                  className={`mt-1.5 text-[11px] font-semibold tracking-wider ${
                    isDone || isCurrent ? 'text-ink' : 'text-muted'
                  }`}
                >
                  {label}
                </span>
              </div>
              {idx < STATIC_STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-colors ${
                    idx < currentStep ? 'bg-purple-600' : 'bg-line'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

interface ActivePipelineChecklistProps {
  steps: PipelineStep[];
  onRetry?: () => void;
  isFailed?: boolean;
}

export function ActivePipelineChecklist({
  steps,
  onRetry,
  isFailed = false,
}: ActivePipelineChecklistProps) {
  return (
    <div className="subsight-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-line pb-4">
        <div>
          <h4 className="font-semibold text-ink text-base">Processing Engine Pipeline</h4>
          <p className="text-xs text-muted">Real-time asynchronous execution trace</p>
        </div>
        {isFailed && onRetry && (
          <button
            onClick={onRetry}
            className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry Analysis
          </button>
        )}
      </div>

      <div className="space-y-3 pt-2">
        {steps.map((step) => {
          const isCompleted = step.status === 'completed';
          const isRunning = step.status === 'running';
          const isStepFailed = step.status === 'failed';

          return (
            <div
              key={step.key}
              className={`flex items-start justify-between rounded-xl p-3 text-sm transition-colors ${
                isCompleted
                  ? 'bg-purple-50/40 dark:bg-purple-950/20'
                  : isRunning
                  ? 'bg-purple-50/80 border border-purple-200 dark:bg-purple-950/50 dark:border-purple-800'
                  : isStepFailed
                  ? 'bg-rose-50 border border-rose-200 dark:bg-rose-950 dark:border-rose-900'
                  : 'bg-transparent text-muted'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  ) : isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
                  ) : isStepFailed ? (
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-line" />
                  )}
                </div>
                <div>
                  <span
                    className={`font-medium ${
                      isCompleted || isRunning ? 'text-ink' : isStepFailed ? 'text-rose-700' : 'text-muted'
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.detail && (
                    <p className={`mt-0.5 text-xs ${isStepFailed ? 'text-rose-600 font-medium' : 'text-muted'}`}>
                      {step.detail}
                    </p>
                  )}
                </div>
              </div>

              {step.ms !== undefined && step.ms !== null && (
                <span className="text-xs text-muted font-mono tabular-nums">{step.ms}ms</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
