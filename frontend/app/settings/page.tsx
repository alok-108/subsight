'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useApp } from '@/lib/context';
import { Card } from '@/components/Card';
import { ErrorState } from '@/components/ErrorState';
import { Skeleton } from '@/components/Skeleton';
import { toast } from 'sonner';
import {
  User as UserIcon,
  Bell,
  Shield,
  Palette,
  Clock,
  Trash2,
  CheckCircle2,
  Save,
  AlertTriangle,
  Lock,
} from 'lucide-react';

export default function SettingsPage() {
  const { userId, theme, setTheme } = useApp();
  const queryClient = useQueryClient();

  const { data: settings, isLoading, isError, refetch } = useQuery({
    queryKey: ['settings', userId],
    queryFn: () => api.getSettings(userId),
  });

  const { data: uploads } = useQuery({
    queryKey: ['uploads', userId],
    queryFn: () => api.getUploads(userId),
  });

  const [displayName, setDisplayName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [notifyRenewals, setNotifyRenewals] = useState(true);
  const [notifyPriceChanges, setNotifyPriceChanges] = useState(true);
  const [notifyReview, setNotifyReview] = useState(true);
  const [retentionDays, setRetentionDays] = useState(365);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (settings) {
      setDisplayName(settings.display_name || '');
      setCurrency(settings.currency || 'INR');
      setNotifyRenewals(settings.notify_renewals ?? true);
      setNotifyPriceChanges(settings.notify_price_changes ?? true);
      setNotifyReview(settings.notify_review ?? true);
      setRetentionDays(settings.data_retention_days || 365);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings(
        {
          display_name: displayName,
          currency,
          theme,
          notify_renewals: notifyRenewals,
          notify_price_changes: notifyPriceChanges,
          notify_review: notifyReview,
          data_retention_days: retentionDays,
        },
        userId
      );
      await queryClient.invalidateQueries();
      toast.success('Settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUploads = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to delete all uploaded statement data? This will remove all associated statement transactions for your profile.'
    );
    if (!confirmed) return;

    setDeleting(true);
    try {
      if (uploads && uploads.length > 0) {
        for (const u of uploads) {
          await api.deleteUpload(u.id, userId);
        }
      }
      await api.resetDemo(userId);
      await queryClient.invalidateQueries();
      toast.success('All uploaded data has been deleted.');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete data');
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-3xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
    );
  }

  if (isError) {
    return <ErrorState title="Failed to load settings" onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Manage profile preferences, privacy controls, theme, and notification triggers.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Profile & Currency */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <UserIcon className="h-4 w-4 text-purple-600" />
            <h2 className="text-base font-semibold text-ink">Profile Preferences</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="subsight-input w-full px-3.5 py-2 text-sm"
                placeholder="Aarav Sharma"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
                Reporting Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="subsight-input w-full px-3.5 py-2 text-sm bg-surface"
              >
                <option value="INR">Indian Rupee (INR ₹)</option>
                <option value="USD">US Dollar (USD $)</option>
                <option value="EUR">Euro (EUR €)</option>
                <option value="GBP">British Pound (GBP £)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Section 2: Appearance & Theme */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <Palette className="h-4 w-4 text-purple-600" />
            <h2 className="text-base font-semibold text-ink">Appearance & Theme</h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
              Color Theme
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['system', 'light', 'dark'] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`flex flex-col items-center justify-center rounded-xl p-3.5 border text-xs font-semibold transition-all ${
                    theme === t
                      ? 'border-purple-600 bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 ring-2 ring-purple-500/20'
                      : 'border-line bg-surface text-muted hover:text-ink'
                  }`}
                >
                  <span className="capitalize">{t}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Section 3: Notification Preferences */}
        <Card className="space-y-5">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <Bell className="h-4 w-4 text-purple-600" />
            <h2 className="text-base font-semibold text-ink">Notification Preferences</h2>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-semibold text-ink">Renewal Reminders</span>
                <p className="text-xs text-muted">Receive alerts before upcoming quarterly or yearly subscription renewals</p>
              </div>
              <input
                type="checkbox"
                checked={notifyRenewals}
                onChange={(e) => setNotifyRenewals(e.target.checked)}
                className="h-4 w-4 rounded accent-purple-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer border-t border-line/60 pt-3">
              <div>
                <span className="text-sm font-semibold text-ink">Price Change Alerts</span>
                <p className="text-xs text-muted">Surfacing stepped price revisions detected across recurring charges</p>
              </div>
              <input
                type="checkbox"
                checked={notifyPriceChanges}
                onChange={(e) => setNotifyPriceChanges(e.target.checked)}
                className="h-4 w-4 rounded accent-purple-600 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer border-t border-line/60 pt-3">
              <div>
                <span className="text-sm font-semibold text-ink">Review Recommended Notices</span>
                <p className="text-xs text-muted">Flagging high-tenure unconfirmed subscriptions</p>
              </div>
              <input
                type="checkbox"
                checked={notifyReview}
                onChange={(e) => setNotifyReview(e.target.checked)}
                className="h-4 w-4 rounded accent-purple-600 cursor-pointer"
              />
            </label>
          </div>
        </Card>

        {/* Section 4: Data Retention & Privacy */}
        <Card className="space-y-5 border-amber-200/70 dark:border-amber-900/60">
          <div className="flex items-center gap-2.5 border-b border-line pb-3">
            <Shield className="h-4 w-4 text-amber-600" />
            <h2 className="text-base font-semibold text-ink">Data Privacy & Retention</h2>
          </div>

          {/* Prominent Privacy Notice Required */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300 space-y-2">
            <p className="font-bold text-sm">
              Your financial data is sensitive. Use only data you are comfortable uploading.
            </p>
            <p className="leading-relaxed">
              SUBSIGHT never connects to your bank and never asks for banking credentials. All statement parsing, normalization, and pattern detection occur locally on your machine.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-2">
              Data Retention Limit
            </label>
            <select
              value={retentionDays}
              onChange={(e) => setRetentionDays(Number(e.target.value))}
              className="subsight-input w-full px-3.5 py-2 text-sm bg-surface"
            >
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
              <option value={365}>365 days (1 Year)</option>
              <option value={730}>730 days (2 Years)</option>
            </select>
          </div>

          {/* Delete Uploaded Data Action */}
          <div className="border-t border-line pt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-sm font-semibold text-ink">Erase Statement Data</span>
              <p className="text-xs text-muted">Permanently delete uploaded statement files and derived transactions</p>
            </div>
            <button
              type="button"
              onClick={handleDeleteUploads}
              disabled={deleting}
              className="btn-secondary px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 border-rose-200 dark:hover:bg-rose-950 inline-flex items-center gap-2 self-start sm:self-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>{deleting ? 'Erasing Data...' : 'Delete Uploaded Data'}</span>
            </button>
          </div>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-purple inline-flex items-center gap-2 px-6 py-2.5 text-sm shadow-md"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
