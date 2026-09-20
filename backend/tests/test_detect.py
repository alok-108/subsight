import pytest
from datetime import date, timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, User, Merchant, Transaction, Subscription
from app.services.normalize import get_or_create_merchant, normalize_merchant
from app.services.detect import (
    cluster_amounts,
    analyze_cadence,
    calculate_confidence,
    detect_subscriptions_for_user
)
from app.services.ingest import compute_dedupe_key
from app.seed.demo_data import generate_synthetic_transactions


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Create dummy user
    u = User(name="Aarav Sharma", region="North", email_demo="aarav.sharma@demo.internal")
    session.add(u)
    session.commit()
    session.refresh(u)

    yield session
    session.close()


def test_merchant_normalization():
    canonical, slug, cat, matched = normalize_merchant("NETFLIX.COM*98412 MUMBAI")
    assert canonical == "Netflix"
    assert slug == "netflix"
    assert matched is True

    canonical, slug, cat, matched = normalize_merchant("AMZN PRIME SUBSCRIPTION")
    assert canonical == "Amazon Prime"
    assert slug == "amazon-prime"
    assert matched is True

    canonical, slug, cat, matched = normalize_merchant("SPOTIFY PREMIUM INDIA")
    assert canonical == "Spotify"
    assert slug == "spotify"
    assert matched is True


def test_amount_clustering_and_price_revision_merge():
    # 499/499/549/549 sequence
    today = date(2026, 4, 1)
    txns = [
        Transaction(user_id=1, date=today - timedelta(days=90), merchant_raw="Cloud Storage", description="Sub", amount=499.0, direction="debit", dedupe_key="k1"),
        Transaction(user_id=1, date=today - timedelta(days=60), merchant_raw="Cloud Storage", description="Sub", amount=499.0, direction="debit", dedupe_key="k2"),
        Transaction(user_id=1, date=today - timedelta(days=30), merchant_raw="Cloud Storage", description="Sub", amount=549.0, direction="debit", dedupe_key="k3"),
        Transaction(user_id=1, date=today, merchant_raw="Cloud Storage", description="Sub", amount=549.0, direction="debit", dedupe_key="k4"),
    ]
    clusters = cluster_amounts(txns)
    assert len(clusters) == 1, "Price revision <= 25% with non-interleaved runs should merge into 1 cluster"
    assert len(clusters[0]) == 4


def test_netflix_monthly_detection(db_session):
    u = db_session.query(User).first()
    today = date(2026, 4, 15)
    m, _ = get_or_create_merchant(db_session, "NETFLIX.COM")

    # 12 monthly payments with 1 skipped month
    for month_idx in range(12):
        if month_idx == 4:
            continue  # skipped month
        d = today - timedelta(days=month_idx * 30)
        t = Transaction(
            user_id=u.id,
            merchant_id=m.id,
            date=d,
            merchant_raw="NETFLIX.COM*12345",
            description="Netflix Subscription",
            amount=649.0,
            direction="debit",
            category="Entertainment",
            dedupe_key=f"netflix_{month_idx}"
        )
        db_session.add(t)
    db_session.commit()

    subs = detect_subscriptions_for_user(db_session, u.id, reference_date=today)
    netflix_sub = next((s for s in subs if s.merchant.slug == "netflix"), None)
    assert netflix_sub is not None
    assert netflix_sub.frequency == "monthly"
    assert netflix_sub.band == "high"
    assert netflix_sub.amount_current == 649.0


def test_amazon_prime_yearly_detection(db_session):
    u = db_session.query(User).first()
    today = date(2026, 4, 15)
    m, _ = get_or_create_merchant(db_session, "AMAZON PRIME ANNUAL")

    t = Transaction(
        user_id=u.id,
        merchant_id=m.id,
        date=today - timedelta(days=340),
        merchant_raw="AMAZON PRIME",
        description="Amazon Prime Annual",
        amount=1499.0,
        direction="debit",
        category="Entertainment",
        dedupe_key="amzn_annual"
    )
    db_session.add(t)
    db_session.commit()

    subs = detect_subscriptions_for_user(db_session, u.id, reference_date=today)
    prime_sub = next((s for s in subs if s.merchant.slug == "amazon-prime"), None)
    assert prime_sub is not None
    assert prime_sub.frequency == "yearly"
    assert prime_sub.annual_cost == 1499.0


def test_zomato_gold_quarterly_cadence(db_session):
    u = db_session.query(User).first()
    today = date(2026, 4, 15)
    m, _ = get_or_create_merchant(db_session, "ZOMATO GOLD 3 MONTHS")

    for q in range(4):
        d = today - timedelta(days=q * 91)
        t = Transaction(
            user_id=u.id,
            merchant_id=m.id,
            date=d,
            merchant_raw="ZOMATO GOLD",
            description="Zomato Gold 3 Months",
            amount=299.0,
            direction="debit",
            category="Food & Dining",
            dedupe_key=f"zomato_gold_{q}"
        )
        db_session.add(t)
    db_session.commit()

    subs = detect_subscriptions_for_user(db_session, u.id, reference_date=today)
    zomato_sub = next((s for s in subs if s.merchant.slug == "zomato-gold"), None)
    assert zomato_sub is not None
    assert zomato_sub.frequency == "quarterly"
    assert zomato_sub.monthly_equivalent == pytest.approx(299.0 / 3.0, 0.01)


def test_cloud_storage_price_increase_single_subscription(db_session):
    u = db_session.query(User).first()
    today = date(2026, 4, 15)
    m, _ = get_or_create_merchant(db_session, "Cloud Storage Pro")

    # 6 older at 499, 5 newer at 549
    for i in range(11):
        amt = 549.0 if i < 5 else 499.0
        d = today - timedelta(days=i * 30)
        t = Transaction(
            user_id=u.id,
            merchant_id=m.id,
            date=d,
            merchant_raw="Cloud Storage Pro",
            description="Monthly Plan",
            amount=amt,
            direction="debit",
            category="Utilities",
            dedupe_key=f"cloud_storage_{i}"
        )
        db_session.add(t)
    db_session.commit()

    subs = detect_subscriptions_for_user(db_session, u.id, reference_date=today)
    cs_subs = [s for s in subs if s.merchant.slug == "cloud-storage"]
    assert len(cs_subs) == 1, "Should be detected as 1 subscription with a price increase"
    assert cs_subs[0].amount_current == 549.0


def test_swiggy_decoy_not_subscription(db_session):
    u = db_session.query(User).first()
    today = date(2026, 4, 15)
    m, _ = get_or_create_merchant(db_session, "Swiggy Delivery")

    # Swiggy Friday orders with variable amounts (decoy)
    amounts = [240, 780, 390, 1120, 450, 890, 310, 620, 1450, 210]
    for i in range(10):
        d = today - timedelta(days=i * 7)
        t = Transaction(
            user_id=u.id,
            merchant_id=m.id,
            date=d,
            merchant_raw="Swiggy Delivery",
            description=f"Swiggy Dinner {i}",
            amount=float(amounts[i]),
            direction="debit",
            category="Food & Dining",
            dedupe_key=f"swiggy_decoy_{i}"
        )
        db_session.add(t)
    db_session.commit()

    subs = detect_subscriptions_for_user(db_session, u.id, reference_date=today)
    swiggy_subs = [s for s in subs if s.merchant.slug == "swiggy"]
    assert len(swiggy_subs) == 0, "Swiggy orders with variable amounts must NOT be classified as subscriptions"


def test_duplicate_transaction_deduplication(db_session):
    u = db_session.query(User).first()
    d = date(2026, 3, 1)
    k1 = compute_dedupe_key(u.id, d, "Netflix", 649.0, "debit")
    k2 = compute_dedupe_key(u.id, d, "Netflix", 649.0, "debit")
    assert k1 == k2, "Dedupe keys for identical transactions must match"
