from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    SECRET_KEY: str = "change-me-in-production"
    DATABASE_URL: str = "sqlite:///./bytebytego_ai.db"
    CONTENT_DIR: str = "./content"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    ALGORITHM: str = "HS256"

    class Config:
        env_file = ".env"


settings = Settings()
