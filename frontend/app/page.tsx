'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useApp } from '@/lib/context';
import { StatCard } from '@/components/StatCard';
import { Card } from '@/components/Card';
import { DashboardSkeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { SpendAreaChart } from '@/components/charts/SpendAreaChart';
import { CategoryDonutChart } from '@/components/charts/CategoryDonutChart';
import { SubscriptionBarChart } from '@/components/charts/SubscriptionBarChart';
import { TrendLineChart } from '@/components/charts/TrendLineChart';
import { formatCurrency, formatFrequency } from '@/lib/format';
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  UploadCloud,
  Sparkles,
} from 'lucide-react';

export default function DashboardPage() {
  const { userId } = useApp();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => api.getDashboard(userId),
  });

  const { data: subscriptions } = useQuery({
    queryKey: ['subscriptions', userId],
    queryFn: () => api.getSubscriptions({ userId, status: 'active' }),
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return <ErrorState title="Unable to load dashboard" onRetry={() => refetch()} />;
  }

  if (data.active_count === 0 && (!data.monthly_series || data.monthly_series.length === 0)) {
    return (
      <EmptyState
        icon={UploadCloud}
        title="No recurring spend detected yet"
        description="Upload your bank or credit card statements to automatically detect recurring payments and subscriptions."
        actionLabel="Upload & Analyze"
        actionHref="/upload"
      />
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Title & Hero */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            Subscription Intelligence
          </h1>
          <p className="mt-1 text-sm text-muted">
            Live recurring payment overview and cadence detection analysis.
          </p>
        </div>
        <Link
          href="/upload"
          className="btn-purple inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm shadow-xs self-start sm:self-auto"
        >
          <UploadCloud className="h-4 w-4" />
          <span>Upload Statement</span>
        </Link>
      </div>

      {/* 4 Primary Metric StatCards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Recurring Spend"
          value={formatCurrency(data.total_monthly)}
          subtext="per month equivalent"
          icon={CreditCard}
        />
        <StatCard
          title="Estimated Annual Cost"
          value={formatCurrency(data.total_annual)}
          subtext="projected 12-month burden"
          icon={Calendar}
        />
        <StatCard
          title="Active Subscriptions"
          value={String(data.active_count)}
          subtext="identified regular merchants"
          icon={TrendingUp}
        />
        <StatCard
          title="Potentially Forgotten"
          value={String(data.forgotten_count)}
          subtext="review recommended"
          icon={AlertTriangle}
          badge={data.forgotten_count > 0 ? 'Review Needed' : 'All Verified'}
          badgeColor={data.forgotten_count > 0 ? 'amber' : 'neutral'}
        />
      </div>

      {/* Charts Grid Row 1: Monthly Recurring Spend + Category Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
            <div>
              <h3 className="text-base font-semibold text-ink">Monthly Recurring Spend</h3>
              <p className="text-xs text-muted">Historical recurring debits across recent billing cycles</p>
            </div>
          </div>
          <SpendAreaChart data={data.monthly_series || []} />
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
            <div>
              <h3 className="text-base font-semibold text-ink">Category Breakdown</h3>
              <p className="text-xs text-muted">Recurring expense distribution by domain</p>
            </div>
          </div>
          <CategoryDonutChart data={data.category_breakdown || []} />
        </Card>
      </div>

      {/* Charts Grid Row 2: Highest Subscription Costs + 12-Month Trend */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
            <div>
              <h3 className="text-base font-semibold text-ink">Highest Subscription Costs</h3>
              <p className="text-xs text-muted">Top individual recurring charges by monthly equivalent</p>
            </div>
            <Link href="/subscriptions" className="text-xs font-semibold text-purple-600 hover:underline flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <SubscriptionBarChart
            data={
              data.top_subscriptions?.map((s) => ({
                merchant_name: s.merchant_name,
                monthly_equivalent: s.monthly_equivalent,
              })) || []
            }
          />
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-line pb-4 mb-4">
            <div>
              <h3 className="text-base font-semibold text-ink">12-Month Recurring Trend</h3>
              <p className="text-xs text-muted">Projected recurring baseline based on verified frequencies</p>
            </div>
          </div>
          <TrendLineChart data={data.trend || []} />
        </Card>
      </div>

      {/* Detected Subscriptions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-ink flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              Detected Subscriptions
            </h2>
            <p className="text-xs text-muted">Subscriptions discovered from automated cadence & pattern clustering</p>
          </div>
          <Link
            href="/subscriptions"
            className="text-xs font-semibold text-purple-600 hover:text-purple-700 flex items-center gap-1.5"
          >
            Manage Subscriptions ({data.active_count}) <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(subscriptions || []).slice(0, 6).map((sub) => (
            <Link key={sub.id} href={`/subscriptions/${sub.id}`}>
              <Card hoverEffect className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700 font-bold text-sm dark:bg-purple-950 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
                    {sub.merchant_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-ink line-clamp-1">{sub.merchant_name}</h4>
                    <p className="text-xs text-muted">{formatFrequency(sub.frequency)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-ink tabular-nums">
                    {formatCurrency(sub.amount_current)}
                  </span>
                  <div className="text-[11px] text-purple-600 font-medium">
                    {Math.round(sub.confidence * 100)}% conf
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
