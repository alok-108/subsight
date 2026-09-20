import React from 'react';

interface ConfidenceBarProps {
  confidence: number; // 0.0 to 1.0
  band?: string; // 'high' | 'medium' | 'low'
  showLabel?: boolean;
}

export function ConfidenceBar({ confidence, band, showLabel = true }: ConfidenceBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round(confidence * 100)));
  
  let computedBand = band;
  if (!computedBand) {
    if (confidence >= 0.8) computedBand = 'high';
    else if (confidence >= 0.62) computedBand = 'medium';
    else computedBand = 'low';
  }

  const bandStyles = {
    high: {
      bar: 'bg-gradient-to-r from-purple-500 to-purple-600',
      text: 'text-purple-700 dark:text-purple-300',
      label: 'High confidence',
      pill: 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300',
    },
    medium: {
      bar: 'bg-gradient-to-r from-purple-400 to-purple-500',
      text: 'text-purple-600 dark:text-purple-400',
      label: 'Medium confidence',
      pill: 'border-purple-200 bg-purple-50/70 text-purple-600 dark:border-purple-800 dark:bg-purple-950/70 dark:text-purple-400',
    },
    low: {
      bar: 'bg-gradient-to-r from-amber-400 to-amber-500',
      text: 'text-amber-700 dark:text-amber-300',
      label: 'Low confidence — review',
      pill: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
    },
  }[computedBand.toLowerCase()] || {
    bar: 'bg-purple-400',
    text: 'text-muted',
    label: `${pct}%`,
    pill: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300',
  };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${bandStyles.pill}`}>
            {bandStyles.label}
          </span>
          <span className="font-semibold text-ink tabular-nums">{pct}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line dark:bg-gray-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${bandStyles.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
