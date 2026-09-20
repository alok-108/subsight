import os
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.models import Base
from app.config import settings

# Normalize database URL
raw_db_url = settings.DATABASE_URL
if raw_db_url.startswith("postgres://"):
    database_url = raw_db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif raw_db_url.startswith("postgresql://") and "+psycopg" not in raw_db_url:
    database_url = raw_db_url.replace("postgresql://", "postgresql+psycopg://", 1)
else:
    database_url = raw_db_url

# If sqlite, ensure parent dir exists
if database_url.startswith("sqlite"):
    db_file = database_url.replace("sqlite:///", "").split("?")[0]
    if db_file and not db_file.startswith(":memory:"):
        Path(db_file).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(
        database_url,
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    # PostgreSQL configuration
    engine = create_engine(
        database_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)
    from app.models import User
    from app.seed.demo_data import seed_demo_data
    
    db: Session = SessionLocal()
    try:
        user_count = db.query(User).count()
        if user_count == 0 and settings.DEMO_MODE:
            print("[DB] No users found and DEMO_MODE=true. Seeding synthetic demo data...")
            seed_demo_data(db)
            print("[DB] Seeding completed.")
        else:
            print(f"[DB] Database initialized. {user_count} profiles present.")
    finally:
        db.close()
