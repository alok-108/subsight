import statistics
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc

from app.db import get_db
from app.models import Subscription, Merchant, Transaction, DetectionResult
from app.schemas import SubscriptionRead, SubscriptionDetail, SubscriptionUpdate, PaymentTimelineItem, PatternIntervalData

router = APIRouter(prefix="/api", tags=["subscriptions"])


@router.get("/subscriptions", response_model=List[SubscriptionRead])
def list_subscriptions(
    user_id: int = Query(1),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    band: Optional[str] = Query(None),
    merchant_id: Optional[int] = Query(None),
    sort: str = Query("cost"),  # cost, confidence, next_payment
    order: str = Query("desc"),
    db: Session = Depends(get_db)
):
    query = db.query(Subscription).filter(Subscription.user_id == user_id)

    if merchant_id is not None:
        query = query.filter(Subscription.merchant_id == merchant_id)

    if status and status.lower() != "all":
        query = query.filter(Subscription.status == status.lower())

    if band and band.lower() != "all":
        query = query.filter(Subscription.band == band.lower())

    if search:
        query = query.join(Merchant, Subscription.merchant_id == Merchant.id).filter(
            Merchant.canonical_name.ilike(f"%{search}%")
        )

    # Sort
    if sort == "confidence":
        sort_col = Subscription.confidence
    elif sort == "next_payment":
        sort_col = Subscription.next_expected
    else:  # cost
        sort_col = Subscription.monthly_equivalent

    if order.lower() == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    subs = query.all()
    results = []
    for s in subs:
        m_name = s.merchant.canonical_name if s.merchant else "Unknown"
        results.append(SubscriptionRead(
            id=s.id,
            user_id=s.user_id,
            merchant_id=s.merchant_id,
            merchant_name=m_name,
            amount_current=s.amount_current,
            currency=s.currency,
            frequency=s.frequency,
            interval_days_median=s.interval_days_median,
            first_seen=s.first_seen,
            last_payment=s.last_payment,
            next_expected=s.next_expected,
            monthly_equivalent=s.monthly_equivalent,
            annual_cost=s.annual_cost,
            confidence=s.confidence,
            band=s.band,
            status=s.status,
            review_flag=s.review_flag,
            review_reasons=s.review_reasons or [],
            occurrences=s.occurrences,
            notes=s.notes,
            created_at=s.created_at,
            updated_at=s.updated_at
        ))
    return results


@router.get("/forgotten", response_model=List[SubscriptionRead])
def get_potentially_forgotten(user_id: int = Query(1), db: Session = Depends(get_db)):
    """
    Returns subscriptions where review_flag is True (review recommended / potentially forgotten).
    """
    subs = (
        db.query(Subscription)
        .filter(
            Subscription.user_id == user_id,
            Subscription.review_flag == True,
            Subscription.status == "active"
        )
        .order_by(desc(Subscription.monthly_equivalent))
        .all()
    )

    results = []
    for s in subs:
        m_name = s.merchant.canonical_name if s.merchant else "Unknown"
        results.append(SubscriptionRead(
            id=s.id,
            user_id=s.user_id,
            merchant_id=s.merchant_id,
            merchant_name=m_name,
            amount_current=s.amount_current,
            currency=s.currency,
            frequency=s.frequency,
            interval_days_median=s.interval_days_median,
            first_seen=s.first_seen,
            last_payment=s.last_payment,
            next_expected=s.next_expected,
            monthly_equivalent=s.monthly_equivalent,
            annual_cost=s.annual_cost,
            confidence=s.confidence,
            band=s.band,
            status=s.status,
            review_flag=s.review_flag,
            review_reasons=s.review_reasons or [],
            occurrences=s.occurrences,
            notes=s.notes,
            created_at=s.created_at,
            updated_at=s.updated_at
        ))
    return results


@router.get("/subscriptions/{sub_id}", response_model=SubscriptionDetail)
def get_subscription_detail(sub_id: int, user_id: int = Query(1), db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.id == sub_id, Subscription.user_id == user_id).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "SUBSCRIPTION_NOT_FOUND", "message": f"Subscription {sub_id} not found."}
        )

    # Query all associated transactions for payment timeline
    txns = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.merchant_id == sub.merchant_id,
            Transaction.direction == "debit",
            Transaction.is_duplicate == False
        )
        .order_by(Transaction.date.asc())
        .all()
    )

    timeline = []
    intervals = []
    amounts = []
    dates = []

    prev_date = None
    prev_amt = None
    for t in txns:
        if prev_date:
            intervals.append((t.date - prev_date).days)
        is_price_step = (prev_amt is not None and abs(t.amount - prev_amt) >= 10.0)
        
        timeline.append(PaymentTimelineItem(
            date=t.date.isoformat(),
            amount=t.amount,
            formatted_date=t.date.strftime("%b %Y"),
            is_price_change=is_price_step
        ))
        amounts.append(t.amount)
        dates.append(t.date.isoformat())
        prev_date = t.date
        prev_amt = t.amount

    stdev = statistics.stdev(intervals) if len(intervals) > 1 else 0.0

    pattern = PatternIntervalData(
        intervals=intervals if intervals else [int(round(sub.interval_days_median))],
        median=sub.interval_days_median,
        stdev=round(stdev, 2),
        amounts=amounts if amounts else [sub.amount_current],
        dates=dates if dates else [sub.last_payment.isoformat()]
    )

    m_name = sub.merchant.canonical_name if sub.merchant else "Unknown"
    return SubscriptionDetail(
        id=sub.id,
        user_id=sub.user_id,
        merchant_id=sub.merchant_id,
        merchant_name=m_name,
        amount_current=sub.amount_current,
        currency=sub.currency,
        frequency=sub.frequency,
        interval_days_median=sub.interval_days_median,
        first_seen=sub.first_seen,
        last_payment=sub.last_payment,
        next_expected=sub.next_expected,
        monthly_equivalent=sub.monthly_equivalent,
        annual_cost=sub.annual_cost,
        confidence=sub.confidence,
        band=sub.band,
        status=sub.status,
        review_flag=sub.review_flag,
        review_reasons=sub.review_reasons or [],
        occurrences=sub.occurrences,
        notes=sub.notes,
        created_at=sub.created_at,
        updated_at=sub.updated_at,
        payment_timeline=timeline,
        pattern=pattern
    )


@router.patch("/subscriptions/{sub_id}", response_model=SubscriptionRead)
def update_subscription(
    sub_id: int,
    patch_data: SubscriptionUpdate,
    user_id: int = Query(1),
    db: Session = Depends(get_db)
):
    sub = db.query(Subscription).filter(Subscription.id == sub_id, Subscription.user_id == user_id).first()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "SUBSCRIPTION_NOT_FOUND", "message": f"Subscription {sub_id} not found."}
        )

    if patch_data.status is not None:
        valid_statuses = ["active", "cancelled", "reviewed", "ignored", "not_subscription"]
        if patch_data.status not in valid_statuses:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_STATUS", "message": f"Status must be one of {valid_statuses}."}
            )
        sub.status = patch_data.status
        # If user explicitly marked status or reviewed, clear review_flag
        if patch_data.status in ["reviewed", "ignored", "not_subscription"]:
            sub.review_flag = False

    if patch_data.reviewed is not None and patch_data.reviewed:
        sub.status = "reviewed"
        sub.review_flag = False

    if patch_data.notes is not None:
        sub.notes = patch_data.notes

    db.commit()
    db.refresh(sub)

    m_name = sub.merchant.canonical_name if sub.merchant else "Unknown"
    return SubscriptionRead(
        id=sub.id,
        user_id=sub.user_id,
        merchant_id=sub.merchant_id,
        merchant_name=m_name,
        amount_current=sub.amount_current,
        currency=sub.currency,
        frequency=sub.frequency,
        interval_days_median=sub.interval_days_median,
        first_seen=sub.first_seen,
        last_payment=sub.last_payment,
        next_expected=sub.next_expected,
        monthly_equivalent=sub.monthly_equivalent,
        annual_cost=sub.annual_cost,
        confidence=sub.confidence,
        band=sub.band,
        status=sub.status,
        review_flag=sub.review_flag,
        review_reasons=sub.review_reasons or [],
        occurrences=sub.occurrences,
        notes=sub.notes,
        created_at=sub.created_at,
        updated_at=sub.updated_at
    )
