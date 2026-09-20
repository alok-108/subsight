from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import InsightsData
from app.services.analytics import get_insights_metrics

router = APIRouter(prefix="/api/insights", tags=["insights"])


@router.get("", response_model=InsightsData)
def get_insights(user_id: int = Query(1), db: Session = Depends(get_db)):
    metrics = get_insights_metrics(db, user_id)
    return InsightsData(**metrics)
