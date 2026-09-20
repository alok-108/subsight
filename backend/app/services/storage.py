import os
import re
import uuid
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, Tuple
from app.config import settings

# Base upload directory for local storage
BASE_DIR = Path(__file__).resolve().parent.parent
LOCAL_UPLOAD_DIR = BASE_DIR / "data" / "uploads"
LOCAL_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def sanitize_filename(filename: str) -> str:
    """Generates a secure, randomized filename preventing path traversal."""
    ext = Path(filename).suffix.lower()
    clean_ext = re.sub(r"[^\w.]", "", ext)
    if clean_ext not in [".csv", ".pdf"]:
        clean_ext = ".csv"
    return f"{uuid.uuid4().hex[:16]}{clean_ext}"


class StorageBackend(ABC):
    @abstractmethod
    def save_file(self, file_bytes: bytes, original_filename: str) -> Tuple[str, str]:
        """Saves file and returns (storage_key, file_url)."""
        pass

    @abstractmethod
    def get_file(self, storage_key: str) -> Optional[bytes]:
        """Retrieves raw file bytes by storage key."""
        pass

    @abstractmethod
    def delete_file(self, storage_key: str) -> bool:
        """Deletes file by storage key."""
        pass


class LocalStorageBackend(StorageBackend):
    def __init__(self, upload_dir: Path = LOCAL_UPLOAD_DIR):
        self.upload_dir = upload_dir
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    def save_file(self, file_bytes: bytes, original_filename: str) -> Tuple[str, str]:
        key = sanitize_filename(original_filename)
        dest_path = self.upload_dir / key
        with open(dest_path, "wb") as f:
            f.write(file_bytes)
        return key, f"/local-files/{key}"

    def get_file(self, storage_key: str) -> Optional[bytes]:
        safe_key = Path(storage_key).name
        file_path = self.upload_dir / safe_key
        if file_path.exists():
            with open(file_path, "rb") as f:
                return f.read()
        return None

    def delete_file(self, storage_key: str) -> bool:
        safe_key = Path(storage_key).name
        file_path = self.upload_dir / safe_key
        if file_path.exists():
            file_path.unlink()
            return True
        return False


class R2StorageBackend(StorageBackend):
    def __init__(self):
        import boto3
        from botocore.config import Config

        self.bucket = settings.R2_BUCKET or "subsight-uploads"
        self.public_url = (settings.R2_PUBLIC_BASE_URL or "").rstrip("/")
        
        endpoint = f"https://{settings.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=settings.R2_ACCESS_KEY_ID,
            aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY,
            region_name="auto",
            config=Config(signature_version="s3v4")
        )

    def save_file(self, file_bytes: bytes, original_filename: str) -> Tuple[str, str]:
        key = sanitize_filename(original_filename)
        content_type = "text/csv" if key.endswith(".csv") else "application/pdf"
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=file_bytes,
            ContentType=content_type
        )
        url = f"{self.public_url}/{key}" if self.public_url else key
        return key, url

    def get_file(self, storage_key: str) -> Optional[bytes]:
        try:
            res = self.client.get_object(Bucket=self.bucket, Key=storage_key)
            return res["Body"].read()
        except Exception:
            return None

    def delete_file(self, storage_key: str) -> bool:
        try:
            self.client.delete_object(Bucket=self.bucket, Key=storage_key)
            return True
        except Exception:
            return False


def get_storage_backend() -> StorageBackend:
    if (
        settings.STORAGE_BACKEND.lower() == "r2"
        and settings.R2_ACCOUNT_ID
        and settings.R2_ACCESS_KEY_ID
        and settings.R2_SECRET_ACCESS_KEY
    ):
        try:
            return R2StorageBackend()
        except Exception as e:
            print(f"[Storage] Failed to initialize R2 client: {e}. Falling back to LocalStorage.")
            return LocalStorageBackend()
    return LocalStorageBackend()
