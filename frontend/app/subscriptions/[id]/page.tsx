'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useApp } from '@/lib/context';
import { Card } from '@/components/Card';
import { StatusPill } from '@/components/StatusPill';
import { ConfidenceBar } from '@/components/ConfidenceBar';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { IntervalScatterPlot } from '@/components/charts/IntervalScatterPlot';
import { AmountStepLineChart } from '@/components/charts/AmountStepLineChart';
import { formatCurrency, formatDate, formatFrequency } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  CheckCircle2,
  Ban,
  EyeOff,
  Sparkles,
  TrendingUp,
  Clock,
  AlertTriangle,
} from 'lucide-react';

export default function SubscriptionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useApp();
  const queryClient = useQueryClient();

  const subId = Number(params?.id);
  const [updating, setUpdating] = useState(false);

  const { data: sub, isLoading, isError, refetch } = useQuery({
    queryKey: ['subscription-detail', subId, userId],
    queryFn: () => api.getSubscription(subId, userId),
    enabled: !isNaN(subId),
  });

  const handleUpdateStatus = async (status: string, label: string) => {
    if (!sub) return;
    setUpdating(true);
    try {
      await api.updateSubscription(sub.id, { status }, userId);
      await queryClient.invalidateQueries();
      toast.success(`${sub.merchant_name} status updated to ${label}`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-44 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !sub) {
    return (
      <ErrorState
        title="Subscription not found"
        message="The requested subscription record does not exist or has been removed."
        onRetry={() => router.push('/subscriptions')}
      />
    );
  }

  const initial = sub.merchant_name.charAt(0).toUpperCase();

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Back Navigation */}
      <Link
        href="/subscriptions"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-ink transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Subscriptions</span>
      </Link>

      {/* Header Banner Card */}
      <Card className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 font-extrabold text-2xl dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shadow-sm">
              {initial}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
                  {sub.merchant_name}
                </h1>
                <StatusPill status={sub.status} reviewFlag={sub.review_flag} />
              </div>
              <p className="mt-1 text-xs text-muted flex items-center gap-2">
                <span>{formatFrequency(sub.frequency)} billing cadence</span>
                <span>•</span>
                <span>Median cycle: {intRound(sub.interval_days_median)} days</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => handleUpdateStatus('active', 'Active (Confirmed)')}
              disabled={updating || sub.status === 'active'}
              className="btn-purple px-3.5 py-2 text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Confirm</span>
            </button>
            <button
              onClick={() => handleUpdateStatus('reviewed', 'Reviewed')}
              disabled={updating || sub.status === 'reviewed'}
              className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>Mark Reviewed</span>
            </button>
            <button
              onClick={() => handleUpdateStatus('ignored', 'Ignored')}
              disabled={updating || sub.status === 'ignored'}
              className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 text-muted hover:text-ink disabled:opacity-50"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span>Ignore</span>
            </button>
            <button
              onClick={() => handleUpdateStatus('not_subscription', 'Not a Subscription')}
              disabled={updating || sub.status === 'not_subscription'}
              className="btn-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 text-rose-600 hover:bg-rose-50 border-rose-200 disabled:opacity-50"
            >
              <Ban className="h-3.5 w-3.5" />
              <span>Not a Subscription</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 border-t border-line pt-6">
          <div>
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Current Amount</span>
            <div className="mt-1 text-2xl font-extrabold text-ink tabular-nums">
              {formatCurrency(sub.amount_current)}
            </div>
            <span className="text-[11px] text-muted">per {sub.frequency}</span>
          </div>

          <div>
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Monthly Equivalent</span>
            <div className="mt-1 text-2xl font-extrabold text-ink tabular-nums">
              {formatCurrency(sub.monthly_equivalent)}
            </div>
            <span className="text-[11px] text-muted">normalized rate</span>
          </div>

          <div>
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Annual Cost</span>
            <div className="mt-1 text-2xl font-extrabold text-ink tabular-nums">
              {formatCurrency(sub.annual_cost)}
            </div>
            <span className="text-[11px] text-muted">projected 12-month</span>
          </div>

          <div>
            <span className="text-xs font-medium text-muted uppercase tracking-wider">Next Expected</span>
            <div className="mt-1 text-lg font-bold text-ink">
              {formatDate(sub.next_expected)}
            </div>
            <span className="text-[11px] text-muted">observed {sub.occurrences} payments</span>
          </div>
        </div>

        {/* Confidence Progress Bar */}
        <div className="border-t border-line pt-4">
          <div className="max-w-md">
            <ConfidenceBar confidence={sub.confidence} band={sub.band} />
          </div>
        </div>
      </Card>

      {/* Review Recommended Reasons (if flagged) */}
      {sub.review_flag && sub.review_reasons && sub.review_reasons.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900 dark:bg-amber-950/40">
          <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span>Review Recommended Heuristic Signals</span>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs text-amber-800 dark:text-amber-300">
            {sub.review_reasons.map((reason, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Payment Timeline Strip */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div>
            <h3 className="text-base font-semibold text-ink">Payment Timeline</h3>
            <p className="text-xs text-muted">Recorded debits ordered chronologically across your statements</p>
          </div>
          <span className="text-xs text-muted font-medium">First seen: {formatDate(sub.first_seen)}</span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto py-2">
          {sub.payment_timeline?.map((item, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center justify-center min-w-[90px] rounded-xl p-2.5 text-center border transition-all ${
                item.is_price_change
                  ? 'border-purple-300 bg-purple-50 dark:border-purple-800 dark:bg-purple-950'
                  : 'border-line bg-canvas'
              }`}
            >
              <span className="text-[11px] font-medium text-muted whitespace-nowrap">
                {item.formatted_date}
              </span>
              <span className="mt-1 text-xs font-bold text-ink tabular-nums">
                {formatCurrency(item.amount)}
              </span>
              {item.is_price_change && (
                <span className="mt-1 rounded-full bg-purple-600 px-1.5 py-0.2 text-[9px] font-bold text-white uppercase tracking-wider">
                  Price Jump
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Pattern Visualizations */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Interval Scatter Plot */}
        <Card className="flex flex-col justify-between">
          <div className="border-b border-line pb-3 mb-4">
            <h3 className="text-base font-semibold text-ink">Billing Interval Regularity</h3>
            <p className="text-xs text-muted">
              Observed day deltas between charges against the median line ({intRound(sub.interval_days_median)} days)
            </p>
          </div>
          <IntervalScatterPlot
            intervals={sub.pattern?.intervals || []}
            median={sub.pattern?.median || sub.interval_days_median}
          />
        </Card>

        {/* Amount Step Line Chart */}
        <Card className="flex flex-col justify-between">
          <div className="border-b border-line pb-3 mb-4">
            <h3 className="text-base font-semibold text-ink">Amount Over Time</h3>
            <p className="text-xs text-muted">
              Step chart tracking charge evolution and detecting price revisions
            </p>
          </div>
          <AmountStepLineChart
            dates={sub.pattern?.dates || []}
            amounts={sub.pattern?.amounts || []}
          />
        </Card>
      </div>
    </div>
  );
}

function intRound(val: number): number {
  return Math.round(val || 30);
}
