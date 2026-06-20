from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    MAX_FILE_SIZE_MB: int = 8
    SCANNED_THRESHOLD_CHARS: int = 100
    CHUNK_WINDOW_TOKENS: int = 3000
    CHUNK_OVERLAP_TOKENS: int = 500

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
