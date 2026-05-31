from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    GCP_BUCKET_NAME: Optional[str] = None
    GCP_PROJECT_ID: Optional[str] = None
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
