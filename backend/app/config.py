from typing import Optional, List
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./app/data/subsight.db"
    ALLOWED_ORIGINS: str = "*"
    ENV: str = "production"
    STORAGE_BACKEND: str = "local"  # "r2" or "local"
    R2_ACCOUNT_ID: Optional[str] = None
    R2_ACCESS_KEY_ID: Optional[str] = None
    R2_SECRET_ACCESS_KEY: Optional[str] = None
    R2_BUCKET: Optional[str] = "subsight-uploads"
    R2_PUBLIC_BASE_URL: Optional[str] = None
    MAX_UPLOAD_MB: int = 10
    DEMO_MODE: bool = True
    GIT_COMMIT_SHA: str = "prod"

    @property
    def parsed_allowed_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS or self.ALLOWED_ORIGINS == "*":
            return ["*"]
        return [origin.strip().rstrip("/") for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
