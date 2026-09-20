'use client';

import React, { useEffect, useState } from 'react';
import { Transaction } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { StatusPill } from './StatusPill';
import { ConfidenceBar } from './ConfidenceBar';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  X,
  Calendar,
  Tag,
  FileText,
  AlertOctagon,
  Sparkles,
  CheckCircle2,
  Ban,
} from 'lucide-react';

interface TransactionDrawerProps {
  transaction: Transaction | null;
  onClose: () => void;
  userId: number;
}

export function TransactionDrawer({ transaction, onClose, userId }: TransactionDrawerProps) {
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!transaction) return null;

  const handleMarkNotSubscription = async () => {
    if (!transaction.merchant_id) return;
    setUpdating(true);
    try {
      // Find subscription ID for this merchant
      const subs = await api.getSubscriptions({ userId, merchantId: transaction.merchant_id });
      const targetSub = subs.find((s) => s.merchant_id === transaction.merchant_id);
      if (targetSub) {
        await api.updateSubscription(targetSub.id, { status: 'not_subscription' }, userId);
        await queryClient.invalidateQueries();
        toast.success(`Marked ${transaction.merchant_name} as not a subscription`);
        onClose();
      } else {
        toast.info('No active subscription found for this merchant');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md bg-surface border-l border-line p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Transaction Details
                </span>
                <h3 className="mt-1 text-xl font-bold text-ink">
                  {transaction.merchant_name || transaction.merchant_raw}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="rounded-xl p-2 text-muted hover:bg-gray-100 hover:text-ink dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Main Amount Card */}
            <div className="mt-6 rounded-2xl bg-canvas border border-line p-5 text-center">
              <span className="text-xs font-medium text-muted uppercase tracking-wider">
                Transaction Amount
              </span>
              <div className="mt-1 text-3xl font-extrabold text-ink tabular-nums">
                {formatCurrency(transaction.amount)}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                  {transaction.direction.toUpperCase()}
                </span>
                {transaction.is_duplicate && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    <AlertOctagon className="h-3 w-3" /> Duplicate Collapsed
                  </span>
                )}
              </div>
            </div>

            {/* Metadata list */}
            <div className="mt-6 space-y-4 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-line/60">
                <span className="flex items-center gap-2 text-muted">
                  <Calendar className="h-4 w-4" /> Date
                </span>
                <span className="font-medium text-ink">{formatDate(transaction.date)}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-line/60">
                <span className="flex items-center gap-2 text-muted">
                  <Tag className="h-4 w-4" /> Category
                </span>
                <span className="font-medium text-ink">{transaction.category}</span>
              </div>

              <div className="flex items-start justify-between py-2 border-b border-line/60">
                <span className="flex items-center gap-2 text-muted">
                  <FileText className="h-4 w-4" /> Raw Narration
                </span>
                <span className="font-mono text-xs text-ink max-w-[220px] text-right break-words">
                  {transaction.description || transaction.merchant_raw}
                </span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-line/60">
                <span className="flex items-center gap-2 text-muted">
                  <Sparkles className="h-4 w-4" /> Classification
                </span>
                <span>
                  {transaction.is_recurring ? (
                    <StatusPill status="active" />
                  ) : (
                    <span className="text-xs text-muted">Standard Expense</span>
                  )}
                </span>
              </div>
            </div>

            {/* Detection Reasoning Section */}
            {transaction.is_recurring && (
              <div className="mt-6 rounded-2xl border border-purple-100 bg-purple-50/40 p-4 dark:border-purple-900/50 dark:bg-purple-950/20">
                <div className="flex items-center gap-2 font-semibold text-xs text-purple-900 dark:text-purple-300 uppercase tracking-wider">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  Detection Reasoning
                </div>
                <div className="mt-3">
                  <ConfidenceBar confidence={transaction.confidence || 0.85} />
                </div>
                <ul className="mt-3 space-y-1.5 text-xs text-muted">
                  {transaction.reasoning && transaction.reasoning.length > 0 ? (
                    transaction.reasoning.map((reason, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </li>
                    ))
                  ) : (
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0 mt-0.5" />
                      <span>Regular cadence and consistent payment amount detected across history.</span>
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="mt-8 border-t border-line pt-4 flex gap-3">
            {transaction.is_recurring ? (
              <button
                onClick={handleMarkNotSubscription}
                disabled={updating}
                className="btn-secondary w-full py-2.5 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:border-rose-200 dark:hover:bg-rose-950 flex items-center justify-center gap-2"
              >
                <Ban className="h-4 w-4" />
                <span>Not a subscription</span>
              </button>
            ) : (
              <button
                onClick={onClose}
                className="btn-secondary w-full py-2.5 text-xs font-medium text-ink"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
