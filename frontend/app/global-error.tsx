'use client';

import React from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-50 text-neutral-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-lg">
          <h2 className="text-xl font-bold">System Error</h2>
          <p className="mt-2 text-xs text-neutral-600">
            {error.message || 'A critical error occurred. Please refresh or retry.'}
          </p>
          <button
            onClick={() => reset()}
            className="mt-6 rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white hover:bg-purple-700"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
