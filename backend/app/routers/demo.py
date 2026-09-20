from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db, Base, engine
from app.models import User, Transaction, Upload, Subscription, DetectionResult, DetectionJob
from app.schemas import UserRead
from app.seed.demo_data import seed_demo_data

from app.config import settings

router = APIRouter(prefix="/api/demo", tags=["demo"])


@router.get("/users", response_model=List[UserRead])
def list_demo_users(db: Session = Depends(get_db)):
    """Returns all 12 synthetic users for the topbar profile switcher."""
    return db.query(User).order_by(User.id.asc()).all()


@router.post("/seed")
def reset_and_reseed(db: Session = Depends(get_db)):
    """Wipes all database tables and reseeds clean synthetic dataset."""
    if not settings.DEMO_MODE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "DEMO_MODE_DISABLED", "message": "Demo reset is disabled in this environment."}
        )
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_demo_data(db)
    return {"status": "ok", "message": "Database reset and re-seeded with synthetic demo data."}


@router.post("/reset")
def reset_user_data(user_id: int = Query(1), db: Session = Depends(get_db)):
    """Wipes all transactions, uploads, and subscriptions for the active profile."""
    db.query(Transaction).filter(Transaction.user_id == user_id).delete()
    db.query(Upload).filter(Upload.user_id == user_id).delete()
    db.query(Subscription).filter(Subscription.user_id == user_id).delete()
    db.commit()
    return {"status": "ok", "message": f"Data reset for user {user_id}."}
