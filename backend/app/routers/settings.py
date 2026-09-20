from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Settings, User
from app.schemas import SettingsRead, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsRead)
def get_user_settings(user_id: int = Query(1), db: Session = Depends(get_db)):
    settings = db.query(Settings).filter(Settings.user_id == user_id).first()
    if not settings:
        user = db.query(User).filter(User.id == user_id).first()
        display_name = user.name if user else "Demo User"
        settings = Settings(
            user_id=user_id,
            display_name=display_name,
            currency="INR",
            theme="system",
            notify_renewals=True,
            notify_price_changes=True,
            notify_review=True,
            data_retention_days=365
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.patch("", response_model=SettingsRead)
def update_user_settings(
    update_data: SettingsUpdate,
    user_id: int = Query(1),
    db: Session = Depends(get_db)
):
    settings = db.query(Settings).filter(Settings.user_id == user_id).first()
    if not settings:
        user = db.query(User).filter(User.id == user_id).first()
        display_name = user.name if user else "Demo User"
        settings = Settings(user_id=user_id, display_name=display_name)
        db.add(settings)

    if update_data.display_name is not None:
        settings.display_name = update_data.display_name
    if update_data.currency is not None:
        settings.currency = update_data.currency
    if update_data.theme is not None:
        settings.theme = update_data.theme
    if update_data.notify_renewals is not None:
        settings.notify_renewals = update_data.notify_renewals
    if update_data.notify_price_changes is not None:
        settings.notify_price_changes = update_data.notify_price_changes
    if update_data.notify_review is not None:
        settings.notify_review = update_data.notify_review
    if update_data.data_retention_days is not None:
        settings.data_retention_days = update_data.data_retention_days

    db.commit()
    db.refresh(settings)
    return settings
