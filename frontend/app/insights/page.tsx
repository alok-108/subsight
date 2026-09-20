'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useApp } from '@/lib/context';
import { StatCard } from '@/components/StatCard';
import { Card } from '@/components/Card';
import { DashboardSkeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { SpendAreaChart } from '@/components/charts/SpendAreaChart';
import { CategoryDonutChart } from '@/components/charts/CategoryDonutChart';
import { formatCurrency } from '@/lib/format';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  CreditCard,
  Calendar,
  DollarSign,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';

export default function InsightsPage() {
  const { userId } = useApp();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['insights', userId],
    queryFn: () => api.getInsights(userId),
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return <ErrorState title="Failed to load insights" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">Financial Insights</h1>
        <p className="mt-1 text-sm text-muted">
          Aggregated analytics, recurring burden projections, and potential monthly savings.
        </p>
      </div>

      {/* Headline Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {data.headline_metrics.map((metric, idx) => (
          <StatCard
            key={idx}
            title={metric.label}
            value={metric.value}
            subtext={metric.subtext}
          />
        ))}
      </div>

      {/* Data-Derived Narratives Banner */}
      <div className="rounded-2xl border border-purple-200 bg-purple-50/60 p-6 dark:border-purple-900/60 dark:bg-purple-950/30 space-y-3">
        <div className="flex items-center gap-2 font-bold text-sm text-purple-900 dark:text-purple-300">
          <Lightbulb className="h-4 w-4 text-purple-600" />
          <span>Automated Recurring Intelligence</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-purple-900 dark:text-purple-200">
          {data.narratives.map((narrative, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{narrative}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row 1: Monthly Spending + Category Distribution */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="flex flex-col justify-between">
          <div className="border-b border-line pb-4 mb-4">
            <h3 className="text-base font-semibold text-ink">Monthly Spend Trajectory</h3>
            <p className="text-xs text-muted">Actual debit volume across active recurring services</p>
          </div>
          <SpendAreaChart data={data.monthly_series || []} />
        </Card>

        <Card className="flex flex-col justify-between">
          <div className="border-b border-line pb-4 mb-4">
            <h3 className="text-base font-semibold text-ink">Category Exposure</h3>
            <p className="text-xs text-muted">Distribution of recurring commitments by spending category</p>
          </div>
          <CategoryDonutChart data={data.category_distribution || []} />
        </Card>
      </div>

      {/* Charts Row 2: Subscription Cost Comparison + 12-Month Cumulative Projection */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Subscription Comparison Bar Chart */}
        <Card className="flex flex-col justify-between">
          <div className="border-b border-line pb-4 mb-4">
            <h3 className="text-base font-semibold text-ink">Annual Burden Comparison</h3>
            <p className="text-xs text-muted">Total 12-month recurring cost by service</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={data.subscription_comparison}
                margin={{ top: 5, right: 20, left: 30, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E9E9EF" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Annual Cost']}
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--line)',
                    borderRadius: '12px',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    boxShadow: 'var(--shadow-elevated)',
                  }}
                />
                <Bar dataKey="annual" fill="#7C3AED" radius={[0, 8, 8, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 12-Month Cumulative Projection Area Chart */}
        <Card className="flex flex-col justify-between">
          <div className="border-b border-line pb-4 mb-4">
            <h3 className="text-base font-semibold text-ink">12-Month Cumulative Outlay</h3>
            <p className="text-xs text-muted">Forward-looking cumulative cash requirement</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.yearly_projection}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E9E9EF" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any) => [formatCurrency(Number(val)), 'Cumulative Spend']}
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--line)',
                    borderRadius: '12px',
                    color: 'var(--ink)',
                    fontSize: '12px',
                    boxShadow: 'var(--shadow-elevated)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#7C3AED"
                  strokeWidth={2.5}
                  fill="url(#cumGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
