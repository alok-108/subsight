from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import DashboardData
from app.services.analytics import get_dashboard_metrics

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardData)
def get_dashboard(user_id: int = Query(1), db: Session = Depends(get_db)):
    metrics = get_dashboard_metrics(db, user_id)
    return DashboardData(**metrics)
