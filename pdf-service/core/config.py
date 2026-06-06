from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    GCP_BUCKET_NAME: Optional[str] = None
    GCP_PROJECT_ID: Optional[str] = None
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None
    
    MAX_FILE_SIZE_MB: int = 20
    SCANNED_THRESHOLD_CHARS: int = 100
    CHUNK_WINDOW_TOKENS: int = 3000
    CHUNK_OVERLAP_TOKENS: int = 500

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
