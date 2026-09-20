'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Toaster } from './Toaster';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col">
      <Toaster />
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="flex flex-1 flex-col lg:pl-64">
        <Topbar onMenuClick={() => setMobileMenuOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        {/* Required Synthetic Data Disclaimer Footer */}
        <footer className="border-t border-line bg-surface/50 py-4 px-6 text-center text-xs text-muted">
          <p>
            All data is synthetic and generated for demonstration. SUBSIGHT never connects to your bank and never asks for banking credentials.
          </p>
        </footer>
      </div>
    </div>
  );
}
