'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  UploadCloud,
  ArrowLeftRight,
  CreditCard,
  AlertTriangle,
  BarChart3,
  Settings,
  HelpCircle,
  X,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Upload & Analyze', href: '/upload', icon: UploadCloud },
  { label: 'Transactions', href: '/transactions', icon: ArrowLeftRight },
  { label: 'Subscriptions', href: '/subscriptions', icon: CreditCard },
  { label: 'Potentially Forgotten', href: '/forgotten', icon: AlertTriangle },
  { label: 'Insights', href: '/insights', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
  { label: 'How It Works', href: '/how-it-works', icon: HelpCircle },
];

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const navContent = (
    <div className="flex h-full flex-col justify-between p-4">
      <div>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-3 py-4">
          <Link href="/" className="flex items-center gap-1.5 focus:outline-none">
            <span className="text-xl font-bold tracking-tight text-ink font-mono">SUBSIGHT</span>
            <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
          </Link>
          {onMobileClose && (
            <button
              onClick={onMobileClose}
              className="lg:hidden rounded-lg p-1.5 text-muted hover:bg-purple-50 hover:text-ink"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Nav Links */}
        <nav className="mt-6 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                className={`group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-purple-50/90 text-purple-700 font-semibold dark:bg-purple-950/60 dark:text-purple-300'
                    : 'text-muted hover:bg-gray-100/70 hover:text-ink dark:hover:bg-gray-900/60'
                }`}
              >
                {/* Purple left active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-purple-600" />
                )}
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive
                      ? 'text-purple-600 dark:text-purple-400'
                      : 'text-muted group-hover:text-ink'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info in Sidebar */}
      <div className="rounded-2xl border border-line bg-canvas p-3.5 text-xs text-muted">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="font-medium text-ink">Detection Active</span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted">
          Deterministic recurrence heuristics running locally.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop fixed sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-64 lg:flex-col border-r border-line bg-surface">
        {navContent}
      </aside>

      {/* Mobile drawer backdrop & sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-72 bg-surface shadow-2xl transition-transform">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
