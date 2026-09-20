import React from 'react';
import Link from 'next/link';
import { Card } from './Card';
import { StatusPill } from './StatusPill';
import { ConfidenceBar } from './ConfidenceBar';
import { Subscription } from '@/lib/types';
import { formatCurrency, formatDate, formatFrequency } from '@/lib/format';
import { Calendar, ChevronRight } from 'lucide-react';

interface SubscriptionCardProps {
  subscription: Subscription;
}

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const initial = subscription.merchant_name.charAt(0).toUpperCase();

  return (
    <Link href={`/subscriptions/${subscription.id}`}>
      <Card hoverEffect className="flex flex-col justify-between h-full group">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 font-bold text-base dark:bg-purple-950 dark:text-purple-300 border border-purple-100 dark:border-purple-800">
                {initial}
              </div>
              <div>
                <h4 className="font-semibold text-ink group-hover:text-purple-600 transition-colors line-clamp-1">
                  {subscription.merchant_name}
                </h4>
                <p className="text-xs text-muted">{formatFrequency(subscription.frequency)} plan</p>
              </div>
            </div>
            <StatusPill status={subscription.status} reviewFlag={subscription.review_flag} />
          </div>

          {/* Pricing Row */}
          <div className="mt-5 border-t border-line/60 pt-4">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xl font-bold tracking-tight text-ink tabular-nums">
                  {formatCurrency(subscription.amount_current)}
                </span>
                <span className="text-xs text-muted"> / {subscription.frequency}</span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-ink tabular-nums">
                  {formatCurrency(subscription.monthly_equivalent)}
                </span>
                <span className="text-[11px] text-muted"> /mo equiv</span>
              </div>
            </div>
          </div>

          {/* Next payment */}
          <div className="mt-3 flex items-center justify-between text-xs text-muted">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted" />
              Next: {formatDate(subscription.next_expected)}
            </span>
            <span className="tabular-nums">
              Annual: {formatCurrency(subscription.annual_cost)}
            </span>
          </div>
        </div>

        {/* Confidence Progress Bar */}
        <div className="mt-5 border-t border-line/60 pt-3 flex items-center justify-between gap-3">
          <div className="flex-1">
            <ConfidenceBar confidence={subscription.confidence} band={subscription.band} />
          </div>
          <ChevronRight className="h-4 w-4 text-muted group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
        </div>
      </Card>
    </Link>
  );
}
