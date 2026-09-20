export interface User {
  id: number;
  name: string;
  region: string;
  email_demo?: string;
  created_at: string;
}

export interface Account {
  id: number;
  user_id: number;
  label: string;
  kind: string;
}

export interface Transaction {
  id: number;
  user_id: number;
  upload_id?: string;
  date: string;
  merchant_raw: string;
  merchant_id?: number;
  merchant_name?: string;
  description: string;
  amount: number;
  direction: 'debit' | 'credit';
  category: string;
  is_duplicate: boolean;
  dedupe_key: string;
  is_recurring: boolean;
  confidence: number;
  reasoning: string[];
}

export interface TransactionListResponse {
  items: Transaction[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UploadPreviewRow {
  date: string;
  merchant: string;
  amount: number;
  description: string;
  category?: string;
  direction?: string;
}

export interface UploadResponse {
  upload_id: string;
  row_count: number;
  parsed: number;
  failed: number;
  preview: UploadPreviewRow[];
  warnings: string[];
}

export interface UploadItem {
  id: string;
  filename: string;
  mime: string;
  row_count: number;
  status: string;
  error?: string;
  created_at: string;
}

export interface PipelineStep {
  key: string;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  detail?: string;
  ms?: number;
}

export interface DetectionJob {
  id: string;
  upload_id?: string;
  status: 'queued' | 'running' | 'done' | 'failed';
  steps: PipelineStep[];
  progress: number;
  started_at: string;
  finished_at?: string;
  error?: string;
}

export interface Subscription {
  id: number;
  user_id: number;
  merchant_id: number;
  merchant_name: string;
  amount_current: number;
  currency: string;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval_days_median: number;
  first_seen: string;
  last_payment: string;
  next_expected: string;
  monthly_equivalent: number;
  annual_cost: number;
  confidence: number;
  band: 'high' | 'medium' | 'low';
  status: 'active' | 'cancelled' | 'reviewed' | 'ignored' | 'not_subscription';
  review_flag: boolean;
  review_reasons: string[];
  occurrences: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentTimelineItem {
  date: string;
  amount: number;
  formatted_date: string;
  is_price_change: boolean;
}

export interface PatternIntervalData {
  intervals: number[];
  median: number;
  stdev: number;
  amounts: number[];
  dates: string[];
}

export interface SubscriptionDetail extends Subscription {
  payment_timeline: PaymentTimelineItem[];
  pattern: PatternIntervalData;
}

export interface TopSubscription {
  id: number;
  merchant_name: string;
  amount: number;
  monthly_equivalent: number;
  frequency: string;
  category: string;
  confidence: number;
  band: string;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface MonthlySeriesPoint {
  month: string;
  amount: number;
}

export interface TrendPoint {
  month: string;
  spend: number;
}

export interface DashboardData {
  total_monthly: number;
  total_annual: number;
  active_count: number;
  forgotten_count: number;
  monthly_series: MonthlySeriesPoint[];
  category_breakdown: CategoryBreakdown[];
  top_subscriptions: TopSubscription[];
  trend: TrendPoint[];
}

export interface HeadlineMetric {
  label: string;
  value: string;
  subtext: string;
  change?: string;
}

export interface SubscriptionComparison {
  name: string;
  monthly: number;
  annual: number;
  frequency: string;
  confidence: number;
}

export interface YearlyProjectionPoint {
  month: string;
  monthly_spend: number;
  cumulative: number;
}

export interface InsightsData {
  headline_metrics: HeadlineMetric[];
  narratives: string[];
  monthly_series: MonthlySeriesPoint[];
  category_distribution: CategoryBreakdown[];
  subscription_comparison: SubscriptionComparison[];
  yearly_projection: YearlyProjectionPoint[];
}

export interface UserSettings {
  id: number;
  user_id: number;
  display_name: string;
  currency: string;
  theme: 'system' | 'light' | 'dark';
  notify_renewals: boolean;
  notify_price_changes: boolean;
  notify_review: boolean;
  data_retention_days: number;
}
