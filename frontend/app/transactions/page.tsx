'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useApp } from '@/lib/context';
import { Transaction } from '@/lib/types';
import { Card } from '@/components/Card';
import { TableSkeleton } from '@/components/Skeleton';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { TransactionDrawer } from '@/components/TransactionDrawer';
import { StatusPill } from '@/components/StatusPill';
import { ConfidenceBar } from '@/components/ConfidenceBar';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  Search,
  ArrowUpDown,
  Filter,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Entertainment',
  'Utilities',
  'Health & Fitness',
  'Food & Dining',
  'Productivity',
  'Groceries',
  'Transport',
  'Shopping',
  'Travel',
  'Electronics',
];

export default function TransactionsPage() {
  const { userId } = useApp();

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [category, setCategory] = useState('All');
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [sort, setSort] = useState<'date' | 'amount'>('date');
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [
      'transactions',
      userId,
      search,
      fromDate,
      toDate,
      category,
      recurringOnly,
      sort,
      order,
      page,
      pageSize,
    ],
    queryFn: () =>
      api.getTransactions({
        userId,
        search: search || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        category: category !== 'All' ? category : undefined,
        recurring: recurringOnly ? true : undefined,
        sort,
        order,
        page,
        pageSize,
      }),
  });

  const toggleSort = (col: 'date' | 'amount') => {
    if (sort === col) {
      setOrder(order === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(col);
      setOrder('desc');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">Transactions</h1>
          <p className="mt-1 text-sm text-muted">
            All extracted debit & credit events with live recurrence classification and signals.
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search by merchant, keyword, or description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="subsight-input w-full pl-10 pr-4 py-2 text-xs"
            />
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Category Select */}
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="subsight-input px-3 py-2 text-xs text-ink bg-surface"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            {/* Recurring Only Toggle */}
            <button
              onClick={() => {
                setRecurringOnly(!recurringOnly);
                setPage(1);
              }}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
                recurringOnly
                  ? 'border-purple-300 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300 font-semibold'
                  : 'border-line bg-surface text-muted hover:text-ink'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-purple-600" />
              <span>Recurring Only</span>
            </button>

            {/* Date Pickers */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
                className="subsight-input px-2.5 py-1.5 text-xs text-muted"
                title="From date"
              />
              <span className="text-xs text-muted">–</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
                className="subsight-input px-2.5 py-1.5 text-xs text-muted"
                title="To date"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Main Table Content */}
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : isError ? (
        <ErrorState title="Failed to load transactions" onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No transactions match filters"
          description="Try modifying your search keywords or clearing active date and category filters."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearch('');
            setCategory('All');
            setRecurringOnly(false);
            setFromDate('');
            setToDate('');
            setPage(1);
          }}
        />
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-canvas border-b border-line text-muted uppercase tracking-wider font-semibold">
                <tr>
                  <th
                    onClick={() => toggleSort('date')}
                    className="px-4 py-3 cursor-pointer hover:text-ink transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-4 py-3">Merchant</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Category</th>
                  <th
                    onClick={() => toggleSort('amount')}
                    className="px-4 py-3 text-right cursor-pointer hover:text-ink transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Amount</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </th>
                  <th className="px-4 py-3">Classification</th>
                  <th className="px-4 py-3">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.items.map((txn) => (
                  <tr
                    key={txn.id}
                    onClick={() => setSelectedTxn(txn)}
                    className="hover:bg-purple-50/40 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-muted font-medium">
                      {formatDate(txn.date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-semibold text-ink">
                      {txn.merchant_name || txn.merchant_raw}
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-[11px] max-w-xs truncate">
                      {txn.description}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                        {txn.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap font-bold text-ink tabular-nums">
                      <span className={txn.direction === 'credit' ? 'text-emerald-600' : 'text-ink'}>
                        {txn.direction === 'credit' ? '+' : ''}
                        {formatCurrency(txn.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {txn.is_recurring ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-600" />
                          Recurring
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted">Standard</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap min-w-[130px]">
                      {txn.is_recurring ? (
                        <ConfidenceBar confidence={txn.confidence} showLabel={false} />
                      ) : (
                        <span className="text-[11px] text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-line bg-canvas/50">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="subsight-input px-2 py-1 text-xs bg-surface"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>
                Showing {(page - 1) * pageSize + 1} – {Math.min(page * pageSize, data.total)} of{' '}
                {data.total}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary p-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-semibold text-ink px-2">
                Page {page} of {data.total_pages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page >= data.total_pages}
                className="btn-secondary p-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Slide-over Transaction Detail Drawer */}
      <TransactionDrawer
        transaction={selectedTxn}
        onClose={() => setSelectedTxn(null)}
        userId={userId}
      />
    </div>
  );
}
