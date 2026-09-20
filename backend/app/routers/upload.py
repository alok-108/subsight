import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, Query, HTTPException, BackgroundTasks, Request, status
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db import get_db, SessionLocal
from app.models import Upload, Transaction, DetectionJob, User
from app.schemas import UploadResponse, UploadRead, DetectionJobRead, AnalyzeRequest, ErrorResponse
from app.services.ingest import parse_csv_content, parse_pdf_content
from app.services.normalize import get_or_create_merchant
from app.services.pipeline import create_initial_job, run_pipeline_job
from app.services.storage import get_storage_backend

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api", tags=["upload"])


def sanitize_cell_formula(val: str) -> str:
    """Escapes formula injection in CSV text."""
    if not val:
        return ""
    s = str(val)
    if s.startswith(("=", "+", "-", "@")):
        return f"'{s}"
    return s


def run_pipeline_in_background(job_id: str, user_id: int):
    db: Session = SessionLocal()
    try:
        run_pipeline_job(db, job_id, user_id)
    finally:
        db.close()


@router.post("/upload", response_model=UploadResponse)
@limiter.limit("10/minute")
async def upload_statement(
    request: Request,
    file: UploadFile = File(...),
    user_id: int = Query(1),
    db: Session = Depends(get_db)
):
    # Verify user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "USER_NOT_FOUND", "message": f"User {user_id} does not exist."}
        )

    # Validate filename and MIME
    filename = file.filename or ""
    content_type = file.content_type or ""
    is_csv = filename.lower().endswith(".csv") or "csv" in content_type
    is_pdf = filename.lower().endswith(".pdf") or "pdf" in content_type

    if not (is_csv or is_pdf):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "INVALID_FILE_TYPE",
                "message": "Unsupported file format. Please upload a CSV (.csv) or PDF (.pdf) bank statement.",
                "detail": {"filename": filename, "mime": content_type}
            }
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "EMPTY_FILE",
                "message": "Uploaded file contains no data.",
                "detail": {"bytes": 0}
            }
        )

    # Save to storage backend (R2 or Local)
    storage = get_storage_backend()
    storage_key, _ = storage.save_file(content, filename)

    # Ingest content
    if is_csv:
        valid_rows, warnings, total_rows, failed_count = parse_csv_content(content, user_id)
    else:
        valid_rows, warnings, total_rows, failed_count = parse_pdf_content(content, user_id)

    if not valid_rows:
        storage.delete_file(storage_key)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "NO_VALID_TRANSACTIONS",
                "message": "Could not extract any valid transactions. Ensure statement includes date and debit/amount columns.",
                "detail": {"warnings": warnings}
            }
        )

    # Create Upload record
    upload_id = f"upl_{uuid.uuid4().hex[:12]}"
    upload_record = Upload(
        id=upload_id,
        user_id=user_id,
        filename=filename,
        mime=content_type or ("text/csv" if is_csv else "application/pdf"),
        row_count=len(valid_rows),
        status="parsed"
    )
    db.add(upload_record)
    db.commit()

    # Query existing dedupe keys for this user
    existing_keys = set(
        k[0] for k in db.query(Transaction.dedupe_key).filter(Transaction.user_id == user_id).all()
    )

    preview_rows = []
    # Insert transactions
    for r in valid_rows:
        merchant, _ = get_or_create_merchant(db, r["merchant_raw"])
        is_dup = r["dedupe_key"] in existing_keys
        if not is_dup:
            existing_keys.add(r["dedupe_key"])

        txn = Transaction(
            user_id=user_id,
            upload_id=upload_id,
            date=r["date"],
            merchant_raw=r["merchant_raw"],
            merchant_id=merchant.id,
            description=r["description"],
            amount=r["amount"],
            direction=r["direction"],
            category=r["category"],
            is_duplicate=is_dup,
            dedupe_key=r["dedupe_key"] if not is_dup else f"{r['dedupe_key']}_dup_{uuid.uuid4().hex[:6]}"
        )
        db.add(txn)

        if len(preview_rows) < 25:
            preview_rows.append({
                "date": r["date"].isoformat(),
                "merchant": sanitize_cell_formula(merchant.canonical_name),
                "amount": r["amount"],
                "description": sanitize_cell_formula(r["description"]),
                "category": sanitize_cell_formula(r["category"]),
                "direction": r["direction"]
            })

    db.commit()

    return UploadResponse(
        upload_id=upload_id,
        row_count=total_rows,
        parsed=len(valid_rows),
        failed=failed_count,
        preview=preview_rows,
        warnings=warnings
    )


@router.get("/uploads", response_model=List[UploadRead])
def list_uploads(user_id: int = Query(1), db: Session = Depends(get_db)):
    return db.query(Upload).filter(Upload.user_id == user_id).order_by(Upload.created_at.desc()).all()


@router.delete("/uploads/{upload_id}")
def delete_upload(upload_id: str, user_id: int = Query(1), db: Session = Depends(get_db)):
    upload = db.query(Upload).filter(Upload.id == upload_id, Upload.user_id == user_id).first()
    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "UPLOAD_NOT_FOUND", "message": f"Upload {upload_id} not found."}
        )

    # Cascade delete transactions associated with this upload
    db.query(Transaction).filter(Transaction.upload_id == upload_id).delete()
    db.delete(upload)
    db.commit()
    return {"status": "deleted", "upload_id": upload_id}


@router.post("/analyze")
@limiter.limit("10/minute")
def start_analysis_job(
    request: Request,
    req: AnalyzeRequest,
    background_tasks: BackgroundTasks,
    user_id: int = Query(1),
    db: Session = Depends(get_db)
):
    job_id = f"job_{uuid.uuid4().hex[:12]}"
    create_initial_job(db, job_id, req.upload_id)
    background_tasks.add_task(run_pipeline_in_background, job_id, user_id)
    return {"job_id": job_id, "status": "queued"}


@router.get("/analyze/{job_id}", response_model=DetectionJobRead)
def get_analysis_status(job_id: str, db: Session = Depends(get_db)):
    job = db.query(DetectionJob).filter(DetectionJob.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "JOB_NOT_FOUND", "message": f"Job {job_id} not found."}
        )

    steps = job.steps or []
    completed_count = sum(1 for s in steps if s.get("status") == "completed")
    progress = int((completed_count / max(len(steps), 1)) * 100) if job.status != "done" else 100

    return DetectionJobRead(
        id=job.id,
        upload_id=job.upload_id,
        status=job.status,
        steps=steps,
        progress=progress,
        started_at=job.started_at,
        finished_at=job.finished_at,
        error=job.error
    )
