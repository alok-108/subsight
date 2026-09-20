'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/context';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  Menu,
  RotateCcw,
  Sun,
  Moon,
  Users,
  ChevronDown,
} from 'lucide-react';

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { userId, setUserId, users, theme, setTheme } = useApp();
  const queryClient = useQueryClient();
  const [resetting, setResetting] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const activeUser = users.find((u) => u.id === userId);

  const handleResetData = async () => {
    const confirmed = window.confirm(
      'Reset demo data? This will restore the initial synthetic transactions and detected subscriptions for this profile.'
    );
    if (!confirmed) return;

    setResetting(true);
    try {
      await api.seedDemo();
      await queryClient.invalidateQueries();
      toast.success('Demo data restored successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset demo data');
    } finally {
      setResetting(false);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-line bg-surface/80 px-4 sm:px-6 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="lg:hidden rounded-xl p-2 text-muted hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Demo Mode Badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-600 animate-ping" />
            Demo Mode
          </span>
          <span className="hidden sm:inline text-xs text-muted">Synthetic Indian Dataset</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Profile Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink shadow-xs hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Users className="h-3.5 w-3.5 text-purple-600" />
            <span className="max-w-[120px] truncate">{activeUser?.name || 'Aarav Sharma'}</span>
            <span className="hidden md:inline rounded-full bg-gray-100 px-1.5 py-0.2 text-[10px] text-muted dark:bg-gray-800">
              {activeUser?.region}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted" />
          </button>

          {userDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setUserDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 z-40 w-56 rounded-2xl border border-line bg-surface p-1.5 shadow-xl">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Switch Demo Profile
                </div>
                <div className="max-h-60 overflow-y-auto space-y-0.5">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        setUserId(u.id);
                        setUserDropdownOpen(false);
                        queryClient.invalidateQueries();
                        toast.info(`Active profile switched to ${u.name}`);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs text-left transition-colors ${
                        u.id === userId
                          ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-purple-950 dark:text-purple-300'
                          : 'text-ink hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <span>{u.name}</span>
                      <span className="text-[10px] text-muted">{u.region}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Reset Demo Data Button */}
        <button
          onClick={handleResetData}
          disabled={resetting}
          className="btn-secondary hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
          title="Reset database to initial synthetic demo state"
        >
          <RotateCcw className={`h-3.5 w-3.5 ${resetting ? 'animate-spin text-purple-600' : ''}`} />
          <span>Reset Demo</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-xl border border-line bg-surface p-2 text-muted hover:text-ink hover:bg-gray-50 dark:hover:bg-gray-800"
          title="Toggle light/dark theme"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
}
