from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://ragverse:ragverse_dev@localhost:5432/ragverse"

    jwt_secret: str = "change-me-to-a-random-secret"
    jwt_access_token_expire_minutes: int = 30
    jwt_refresh_token_expire_days: int = 7

    anthropic_api_key: str = ""
    openai_api_key: str = ""

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
