import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string;
  subtext?: string;
  icon?: LucideIcon;
  badge?: string;
  badgeColor?: 'purple' | 'amber' | 'neutral';
}

export function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  badge,
  badgeColor = 'purple',
}: StatCardProps) {
  const badgeClasses = {
    purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
    amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  }[badgeColor];

  return (
    <Card hoverEffect className="relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</span>
        {Icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300">
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <h3 className="text-2xl font-bold tracking-tight text-ink tabular-nums">{value}</h3>
        {badge && (
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badgeClasses}`}>
            {badge}
          </span>
        )}
      </div>

      {subtext && <p className="mt-1 text-xs text-muted">{subtext}</p>}
    </Card>
  );
}
