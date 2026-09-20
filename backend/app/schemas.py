import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str
    message: str
    detail: Optional[Any] = None


class ErrorResponse(BaseModel):
    error: ErrorDetail


class UserRead(BaseModel):
    id: int
    name: str
    region: str
    email_demo: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class AccountRead(BaseModel):
    id: int
    user_id: int
    label: str
    kind: str

    class Config:
        from_attributes = True


class MerchantRead(BaseModel):
    id: int
    canonical_name: str
    slug: str
    aliases: List[str] = []
    default_category: str

    class Config:
        from_attributes = True


class TransactionRead(BaseModel):
    id: int
    user_id: int
    upload_id: Optional[str] = None
    date: datetime.date
    merchant_raw: str
    merchant_id: Optional[int] = None
    merchant_name: Optional[str] = None
    description: str
    amount: float
    direction: str
    category: str
    is_duplicate: bool
    dedupe_key: str
    is_recurring: bool = False
    confidence: float = 0.0
    reasoning: List[str] = []

    class Config:
        from_attributes = True


class TransactionListResponse(BaseModel):
    items: List[TransactionRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class UploadPreviewRow(BaseModel):
    date: str
    merchant: str
    amount: float
    description: str
    category: Optional[str] = "General"
    direction: Optional[str] = "debit"


class UploadResponse(BaseModel):
    upload_id: str
    row_count: int
    parsed: int
    failed: int
    preview: List[Dict[str, Any]]
    warnings: List[str]


class UploadRead(BaseModel):
    id: str
    filename: str
    mime: str
    row_count: int
    status: str
    error: Optional[str] = None
    created_at: datetime.datetime

    class Config:
        from_attributes = True


class PipelineStep(BaseModel):
    key: str
    label: str
    status: str  # pending, running, completed, failed
    detail: Optional[str] = None
    ms: Optional[int] = None


class DetectionJobRead(BaseModel):
    id: str
    upload_id: Optional[str] = None
    status: str  # queued, running, done, failed
    steps: List[PipelineStep]
    progress: int  # 0 to 100
    started_at: datetime.datetime
    finished_at: Optional[datetime.datetime] = None
    error: Optional[str] = None


class AnalyzeRequest(BaseModel):
    upload_id: Optional[str] = None


class SubscriptionRead(BaseModel):
    id: int
    user_id: int
    merchant_id: int
    merchant_name: str
    amount_current: float
    currency: str = "INR"
    frequency: str
    interval_days_median: float
    first_seen: datetime.date
    last_payment: datetime.date
    next_expected: datetime.date
    monthly_equivalent: float
    annual_cost: float
    confidence: float
    band: str
    status: str
    review_flag: bool
    review_reasons: List[str] = []
    occurrences: int
    notes: Optional[str] = None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    class Config:
        from_attributes = True


class PaymentTimelineItem(BaseModel):
    date: str
    amount: float
    formatted_date: str
    is_price_change: bool = False


class PatternIntervalData(BaseModel):
    intervals: List[int]
    median: float
    stdev: float
    amounts: List[float]
    dates: List[str]


class SubscriptionDetail(SubscriptionRead):
    payment_timeline: List[PaymentTimelineItem] = []
    pattern: PatternIntervalData


class SubscriptionUpdate(BaseModel):
    status: Optional[str] = None  # active, cancelled, reviewed, ignored, not_subscription
    reviewed: Optional[bool] = None
    notes: Optional[str] = None


class DashboardData(BaseModel):
    total_monthly: float
    total_annual: float
    active_count: int
    forgotten_count: int
    monthly_series: List[Dict[str, Any]]
    category_breakdown: List[Dict[str, Any]]
    top_subscriptions: List[Dict[str, Any]]
    trend: List[Dict[str, Any]]


class InsightMetric(BaseModel):
    label: str
    value: str
    subtext: str
    change: Optional[str] = None


class InsightsData(BaseModel):
    headline_metrics: List[InsightMetric]
    narratives: List[str]
    monthly_series: List[Dict[str, Any]]
    category_distribution: List[Dict[str, Any]]
    subscription_comparison: List[Dict[str, Any]]
    yearly_projection: List[Dict[str, Any]]


class SettingsRead(BaseModel):
    id: int
    user_id: int
    display_name: str
    currency: str
    theme: str
    notify_renewals: bool
    notify_price_changes: bool
    notify_review: bool
    data_retention_days: int

    class Config:
        from_attributes = True


class SettingsUpdate(BaseModel):
    display_name: Optional[str] = None
    currency: Optional[str] = None
    theme: Optional[str] = None
    notify_renewals: Optional[bool] = None
    notify_price_changes: Optional[bool] = None
    notify_review: Optional[bool] = None
    data_retention_days: Optional[int] = None
