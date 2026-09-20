'use client';

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useApp } from '@/lib/context';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { formatCurrency, formatDate, formatFrequency } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';

export default function ForgottenSubscriptionsPage() {
  const { userId } = useApp();
  const queryClient = useQueryClient();
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const { data: subs, isLoading, isError, refetch } = useQuery({
    queryKey: ['forgotten-subscriptions', userId],
    queryFn: () => api.getForgotten(userId),
  });

  const handleKeep = async (subId: number, merchantName: string) => {
    setActionLoadingId(subId);
    try {
      // Keeps active status and clears review_flag
      await api.updateSubscription(subId, { status: 'active', reviewed: true }, userId);
      await queryClient.invalidateQueries();
      toast.success(`Confirmed ${merchantName} — review flag cleared`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update subscription');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleIgnore = async (subId: number, merchantName: string) => {
    setActionLoadingId(subId);
    try {
      await api.updateSubscription(subId, { status: 'ignored' }, userId);
      await queryClient.invalidateQueries();
      toast.info(`Ignored ${merchantName}`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to ignore subscription');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Potentially Forgotten Subscriptions
        </h1>
        <p className="mt-1 text-sm text-muted">
          Active recurring charges identified by tenure and renewal cadence requiring user verification.
        </p>
      </div>

      {/* Required Explanatory Heuristic Banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-semibold text-sm">Review Recommended Heuristic</p>
            <p className="leading-relaxed">
              SUBSIGHT flags active recurring subscriptions with high confidence that have run for at least 6 months (or annual renewals due soon) without your explicit confirmation.
            </p>
          </div>
        </div>
      </div>

      {/* Flagged Subscriptions Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="subsight-card p-6 space-y-4">
              <Skeleton className="h-6 w-36" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="Failed to load review items" onRetry={() => refetch()} />
      ) : !subs || subs.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No subscriptions need review right now"
          description="All active recurring subscriptions have been confirmed or have not yet reached the review threshold."
          actionLabel="View All Subscriptions"
          actionHref="/subscriptions"
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {subs.map((sub) => {
            const initial = sub.merchant_name.charAt(0).toUpperCase();
            const tenureDays = Math.max(
              0,
              Math.round(
                (new Date(sub.last_payment).getTime() - new Date(sub.first_seen).getTime()) /
                  (1000 * 60 * 60 * 24)
              )
            );
            const tenureMonths = Math.max(1, Math.round(tenureDays / 30));

            return (
              <Card key={sub.id} className="flex flex-col justify-between border-amber-200/80 dark:border-amber-900/60 p-6 space-y-5">
                <div>
                  {/* Top merchant row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 font-bold text-lg dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {initial}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-ink">{sub.merchant_name}</h3>
                        <p className="text-xs text-muted">{formatFrequency(sub.frequency)} billing</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
                      Review Recommended
                    </span>
                  </div>

                  {/* Amounts and Tenure */}
                  <div className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-canvas p-3.5 border border-line">
                    <div>
                      <span className="text-[11px] font-medium text-muted uppercase">Monthly Rate</span>
                      <div className="text-xl font-bold text-ink tabular-nums">
                        {formatCurrency(sub.monthly_equivalent)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[11px] font-medium text-muted uppercase">Observed Tenure</span>
                      <div className="text-base font-bold text-ink flex items-center gap-1">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span>~{tenureMonths} months</span>
                      </div>
                    </div>
                  </div>

                  {/* Why Flagged Block */}
                  <div className="mt-5 rounded-xl border border-line bg-surface p-4 space-y-2">
                    <span className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                      Why Flagged
                    </span>
                    <ul className="space-y-1.5 text-xs text-muted pl-1">
                      {sub.review_reasons && sub.review_reasons.length > 0 ? (
                        sub.review_reasons.map((r, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                            <span>{r}</span>
                          </li>
                        ))
                      ) : (
                        <li className="flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                          <span>Active recurring charges detected without explicit user confirmation.</span>
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                    <Calendar className="h-3.5 w-3.5 text-muted" />
                    <span>Next expected renewal on {formatDate(sub.next_expected)}</span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="border-t border-line pt-4 flex items-center justify-between gap-2">
                  <Link
                    href={`/subscriptions/${sub.id}`}
                    className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"
                  >
                    <span>Review Details</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleIgnore(sub.id, sub.merchant_name)}
                      disabled={actionLoadingId === sub.id}
                      className="btn-secondary px-3 py-2 text-xs text-muted hover:text-ink flex items-center gap-1.5"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      <span>Ignore</span>
                    </button>
                    <button
                      onClick={() => handleKeep(sub.id, sub.merchant_name)}
                      disabled={actionLoadingId === sub.id}
                      className="btn-purple px-4 py-2 text-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Keep Subscription</span>
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
