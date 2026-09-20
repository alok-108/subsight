import React from 'react';
import { LucideIcon } from 'lucide-react';
import Link from 'next/link';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="subsight-card flex flex-col items-center justify-center p-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
      
      {actionLabel && (
        <div className="mt-6">
          {actionHref ? (
            <Link href={actionHref} className="btn-purple inline-flex items-center px-4 py-2.5 text-sm">
              {actionLabel}
            </Link>
          ) : (
            <button onClick={onAction} className="btn-purple inline-flex items-center px-4 py-2.5 text-sm">
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
