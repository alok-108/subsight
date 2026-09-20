from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.db import init_db
from app.routers import upload, transactions, subscriptions, dashboard, insights, settings as settings_router, demo

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="SUBSIGHT API",
    description="Intelligent personal-finance subscription & recurring payment detection engine",
    version=settings.GIT_COMMIT_SHA
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS configuration
allowed_origins = settings.parsed_allowed_origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if allowed_origins != ["*"] else ["*"],
    allow_credentials=True if allowed_origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def check_upload_size(request: Request, call_next):
    # Enforce max upload size limit
    content_length = request.headers.get("content-length")
    if content_length:
        max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
        if int(content_length) > max_bytes:
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={
                    "error": {
                        "code": "PAYLOAD_TOO_LARGE",
                        "message": f"Uploaded file exceeds maximum limit of {settings.MAX_UPLOAD_MB}MB.",
                        "detail": {"max_mb": settings.MAX_UPLOAD_MB}
                    }
                }
            )
    return await call_next(request)


@app.on_event("startup")
def on_startup():
    init_db()


# Standardized Error Envelope Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    if isinstance(exc.detail, dict) and "code" in exc.detail:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail}
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "HTTP_ERROR",
                "message": str(exc.detail),
                "detail": None
            }
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request parameter validation failed.",
                "detail": exc.errors()
            }
        }
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc),
                "detail": None
            }
        }
    )


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "db": "connected",
        "version": settings.GIT_COMMIT_SHA
    }


# Include Routers
app.include_router(upload.router)
app.include_router(transactions.router)
app.include_router(subscriptions.router)
app.include_router(dashboard.router)
app.include_router(insights.router)
app.include_router(settings_router.router)
app.include_router(demo.router)
