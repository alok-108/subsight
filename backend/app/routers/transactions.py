import math
from datetime import datetime, date
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from app.db import get_db
from app.models import Transaction, Merchant, Subscription, DetectionResult
from app.schemas import TransactionListResponse, TransactionRead

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=TransactionListResponse)
def get_transactions(
    user_id: int = Query(1),
    search: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None, alias="from"),
    to_date: Optional[str] = Query(None, alias="to"),
    category: Optional[str] = Query(None),
    recurring: Optional[bool] = Query(None),
    merchant_id: Optional[int] = Query(None),
    sort: str = Query("date"),
    order: str = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(Transaction).filter(Transaction.user_id == user_id)

    # Search filter
    if search:
        search_term = f"%{search}%"
        query = query.join(Merchant, Transaction.merchant_id == Merchant.id, isouter=True).filter(
            or_(
                Transaction.merchant_raw.ilike(search_term),
                Transaction.description.ilike(search_term),
                Merchant.canonical_name.ilike(search_term)
            )
        )

    # Date range filters
    if from_date:
        try:
            d_from = datetime.strptime(from_date, "%Y-%m-%d").date()
            query = query.filter(Transaction.date >= d_from)
        except ValueError:
            pass

    if to_date:
        try:
            d_to = datetime.strptime(to_date, "%Y-%m-%d").date()
            query = query.filter(Transaction.date <= d_to)
        except ValueError:
            pass

    # Category filter
    if category and category.lower() != "all":
        categories = [c.strip() for c in category.split(",") if c.strip()]
        if categories:
            query = query.filter(Transaction.category.in_(categories))

    # Merchant filter
    if merchant_id is not None:
        query = query.filter(Transaction.merchant_id == merchant_id)

    # Cache active subscription merchants for recurring flag
    sub_merchants = set(
        s.merchant_id for s in db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.status.in_(["active", "reviewed"])
        ).all()
    )

    if recurring is not None:
        if recurring:
            query = query.filter(Transaction.merchant_id.in_(sub_merchants))
        else:
            query = query.filter(or_(
                Transaction.merchant_id == None,
                ~Transaction.merchant_id.in_(sub_merchants)
            ))

    # Sorting
    sort_col = Transaction.amount if sort == "amount" else Transaction.date
    if order.lower() == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size
    txns = query.offset(offset).limit(page_size).all()

    # Build response items
    items = []
    for t in txns:
        is_rec = t.merchant_id in sub_merchants if t.merchant_id else False
        m_name = t.merchant.canonical_name if t.merchant else t.merchant_raw
        
        # Pull confidence from subscription if recurring
        conf = 0.0
        reasoning = []
        if is_rec:
            sub = db.query(Subscription).filter(
                Subscription.user_id == user_id,
                Subscription.merchant_id == t.merchant_id
            ).first()
            if sub:
                conf = sub.confidence
                det = db.query(DetectionResult).filter(DetectionResult.merchant_id == t.merchant_id).first()
                if det and det.explanation:
                    reasoning = det.explanation

        items.append(TransactionRead(
            id=t.id,
            user_id=t.user_id,
            upload_id=t.upload_id,
            date=t.date,
            merchant_raw=t.merchant_raw,
            merchant_id=t.merchant_id,
            merchant_name=m_name,
            description=t.description,
            amount=t.amount,
            direction=t.direction,
            category=t.category,
            is_duplicate=t.is_duplicate,
            dedupe_key=t.dedupe_key,
            is_recurring=is_rec,
            confidence=conf,
            reasoning=reasoning
        ))

    return TransactionListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{txn_id}", response_model=TransactionRead)
def get_transaction_by_id(txn_id: int, user_id: int = Query(1), db: Session = Depends(get_db)):
    t = db.query(Transaction).filter(Transaction.id == txn_id, Transaction.user_id == user_id).first()
    if not t:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "TRANSACTION_NOT_FOUND", "message": f"Transaction {txn_id} not found."}
        )

    sub = None
    if t.merchant_id:
        sub = db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.merchant_id == t.merchant_id
        ).first()

    is_rec = sub is not None and sub.status in ["active", "reviewed"]
    conf = sub.confidence if sub else 0.0
    reasoning = []
    if sub:
        det = db.query(DetectionResult).filter(DetectionResult.merchant_id == t.merchant_id).first()
        if det and det.explanation:
            reasoning = det.explanation

    return TransactionRead(
        id=t.id,
        user_id=t.user_id,
        upload_id=t.upload_id,
        date=t.date,
        merchant_raw=t.merchant_raw,
        merchant_id=t.merchant_id,
        merchant_name=t.merchant.canonical_name if t.merchant else t.merchant_raw,
        description=t.description,
        amount=t.amount,
        direction=t.direction,
        category=t.category,
        is_duplicate=t.is_duplicate,
        dedupe_key=t.dedupe_key,
        is_recurring=is_rec,
        confidence=conf,
        reasoning=reasoning
    )
