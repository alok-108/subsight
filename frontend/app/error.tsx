'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // In production we avoid console spam or send to an error monitor if configured
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="subsight-card max-w-md p-8 text-center border-rose-200 dark:border-rose-900/60">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-ink">Application encountered an error</h2>
        <p className="mt-1 text-xs text-muted leading-relaxed">
          {error.message || 'An unexpected error occurred while loading this view.'}
        </p>
        <button
          onClick={() => reset()}
          className="btn-purple mt-6 inline-flex items-center gap-2 px-4 py-2 text-xs"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );
}
