---
title: "Environment Configuration"
description: "Manage configuration across environments using best practices."
duration_minutes: 20
order: 2
---

## The Twelve-Factor App Config

Configuration should be stored in the environment, not in code. Never commit secrets to version control.

## pydantic-settings

```python
# config.py
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Required (no default = must be set)
    SECRET_KEY: str
    DATABASE_URL: str

    # Optional with defaults
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    ALLOWED_HOSTS: list[str] = ["localhost"]
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
```

## .env Files

```bash
# .env (never commit this)
SECRET_KEY=super-secret-key-abc123
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
DEBUG=true
LOG_LEVEL=DEBUG

# .env.example (commit this as template)
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
DEBUG=false
LOG_LEVEL=INFO
```

## Multiple Environments

```python
# config.py
from enum import Enum

class Environment(str, Enum):
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

class Settings(BaseSettings):
    ENVIRONMENT: Environment = Environment.DEVELOPMENT
    SECRET_KEY: str
    DATABASE_URL: str

    # Environment-specific defaults
    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == Environment.PRODUCTION

    @property
    def debug(self) -> bool:
        return self.ENVIRONMENT == Environment.DEVELOPMENT

    class Config:
        env_file = ".env"
```

## Key Takeaways

1. Never commit secrets to version control
2. Use `pydantic-settings` for typed, validated config
3. Commit `.env.example` as documentation
4. Use `@lru_cache` to avoid re-reading config on every request
5. Separate config by environment (dev/staging/prod)
