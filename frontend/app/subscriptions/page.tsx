'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useApp } from '@/lib/context';
import { SubscriptionCard } from '@/components/SubscriptionCard';
import { Card } from '@/components/Card';
import { Skeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { Search, Filter, CreditCard, ArrowUpDown, Sparkles } from 'lucide-react';

const STATUS_FILTERS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Ignored', value: 'ignored' },
  { label: 'Not Subscription', value: 'not_subscription' },
];

export default function SubscriptionsPage() {
  const { userId } = useApp();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [sort, setSort] = useState<'cost' | 'confidence' | 'next_payment'>('cost');
  const [order, setOrder] = useState<'desc' | 'asc'>('desc');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['subscriptions-list', userId, search, status, sort, order],
    queryFn: () =>
      api.getSubscriptions({
        userId,
        search: search || undefined,
        status: status !== 'all' ? status : undefined,
        sort,
        order,
      }),
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            Recurring Subscriptions
          </h1>
          <p className="mt-1 text-sm text-muted">
            All detected recurring merchant commitments with confidence evaluation and schedule metrics.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search subscriptions by service name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="subsight-input w-full pl-10 pr-4 py-2 text-xs"
            />
          </div>

          {/* Status & Sort controls */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="subsight-input px-3 py-2 text-xs text-ink bg-surface"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(e: any) => setSort(e.target.value)}
              className="subsight-input px-3 py-2 text-xs text-ink bg-surface"
            >
              <option value="cost">Sort by Cost</option>
              <option value="confidence">Sort by Confidence</option>
              <option value="next_payment">Sort by Next Payment</option>
            </select>

            <button
              onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
              className="btn-secondary px-3 py-2 text-xs flex items-center gap-1.5"
              title="Toggle sort order"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>{order === 'desc' ? 'High to Low' : 'Low to High'}</span>
            </button>
          </div>
        </div>
      </Card>

      {/* Grid Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="subsight-card p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-11 w-11 rounded-2xl" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="Failed to load subscriptions" onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No subscriptions match your criteria"
          description="Try adjusting your search terms or clearing the status filter."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearch('');
            setStatus('all');
          }}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((sub) => (
            <SubscriptionCard key={sub.id} subscription={sub} />
          ))}
        </div>
      )}
    </div>
  );
}
