import datetime
from typing import Optional, List, Any
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    JSON,
    Text
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    region = Column(String(50), nullable=False)
    email_demo = Column(String(150), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    uploads = relationship("Upload", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    settings = relationship("Settings", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(100), nullable=False)
    kind = Column(String(50), default="savings")

    user = relationship("User", back_populates="accounts")


class Upload(Base):
    __tablename__ = "uploads"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    filename = Column(String(255), nullable=False)
    mime = Column(String(100), nullable=False)
    row_count = Column(Integer, default=0)
    status = Column(String(50), default="parsed")  # parsed, failed
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="uploads")
    transactions = relationship("Transaction", back_populates="upload", cascade="all, delete-orphan")


class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(Integer, primary_key=True, index=True)
    canonical_name = Column(String(150), nullable=False)
    slug = Column(String(150), unique=True, index=True, nullable=False)
    aliases = Column(JSON, default=list)  # list of strings
    default_category = Column(String(100), default="General")

    transactions = relationship("Transaction", back_populates="merchant")
    subscriptions = relationship("Subscription", back_populates="merchant")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    upload_id = Column(String(64), ForeignKey("uploads.id", ondelete="SET NULL"), nullable=True)
    date = Column(Date, nullable=False, index=True)
    merchant_raw = Column(String(255), nullable=False)
    merchant_id = Column(Integer, ForeignKey("merchants.id", ondelete="SET NULL"), nullable=True, index=True)
    description = Column(String(500), nullable=False)
    amount = Column(Float, nullable=False)
    direction = Column(String(10), default="debit")  # debit, credit
    category = Column(String(100), default="General")
    is_duplicate = Column(Boolean, default=False)
    dedupe_key = Column(String(128), unique=True, index=True, nullable=False)

    user = relationship("User", back_populates="transactions")
    upload = relationship("Upload", back_populates="transactions")
    merchant = relationship("Merchant", back_populates="transactions")


class DetectionJob(Base):
    __tablename__ = "detection_jobs"

    id = Column(String(64), primary_key=True, index=True)
    upload_id = Column(String(64), nullable=True)
    status = Column(String(50), default="queued")  # queued, running, done, failed
    steps = Column(JSON, default=list)  # [{key, label, status, detail, ms}]
    started_at = Column(DateTime, default=datetime.datetime.utcnow)
    finished_at = Column(DateTime, nullable=True)
    error = Column(Text, nullable=True)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False, index=True)
    amount_current = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    frequency = Column(String(20), default="monthly")  # weekly, monthly, quarterly, yearly
    interval_days_median = Column(Float, default=30.0)
    first_seen = Column(Date, nullable=False)
    last_payment = Column(Date, nullable=False)
    next_expected = Column(Date, nullable=False)
    monthly_equivalent = Column(Float, nullable=False)
    annual_cost = Column(Float, nullable=False)
    confidence = Column(Float, default=1.0)
    band = Column(String(20), default="high")  # high, medium, low
    status = Column(String(30), default="active")  # active, cancelled, reviewed, ignored, not_subscription
    review_flag = Column(Boolean, default=False)
    review_reasons = Column(JSON, default=list)  # list of strings
    occurrences = Column(Integer, default=1)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="subscriptions")
    merchant = relationship("Merchant", back_populates="subscriptions")


class DetectionResult(Base):
    __tablename__ = "detection_results"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(64), ForeignKey("detection_jobs.id", ondelete="SET NULL"), nullable=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id", ondelete="CASCADE"), nullable=False)
    cluster_key = Column(String(100), nullable=False)
    signals = Column(JSON, default=dict)
    confidence = Column(Float, default=0.0)
    explanation = Column(JSON, default=list)
    accepted = Column(Boolean, default=True)


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    display_name = Column(String(100), default="Aarav Sharma")
    currency = Column(String(10), default="INR")
    theme = Column(String(20), default="system")  # system, light, dark
    notify_renewals = Column(Boolean, default=True)
    notify_price_changes = Column(Boolean, default=True)
    notify_review = Column(Boolean, default=True)
    data_retention_days = Column(Integer, default=365)

    user = relationship("User", back_populates="settings")
