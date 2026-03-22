---
title: "Logging and Observability"
description: "Instrument applications with structured logging and monitoring."
duration_minutes: 25
order: 3
---

## Python Logging

```python
import logging

# Basic config
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
)

logger = logging.getLogger(__name__)

logger.debug("Debug message")
logger.info("Info message")
logger.warning("Warning message")
logger.error("Error message")
logger.critical("Critical message")
```

## Structured Logging with structlog

```bash
pip install structlog
```

```python
import structlog

log = structlog.get_logger()

log.info("user_created", user_id=123, email="alice@example.com")
# {"event": "user_created", "user_id": 123, "email": "alice@example.com", "timestamp": "..."}
```

## FastAPI Logging Setup

```python
import logging
import sys

def setup_logging(log_level: str = "INFO"):
    logging.basicConfig(
        stream=sys.stdout,
        level=getattr(logging, log_level.upper()),
        format="%(asctime)s %(name)s %(levelname)s %(message)s",
    )

# In main.py
@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging(settings.LOG_LEVEL)
    yield
```

## Request Logging Middleware

```python
import uuid
import logging
from fastapi import Request

logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = str(uuid.uuid4())[:8]
    logger.info(
        "request_started",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
        }
    )
    response = await call_next(request)
    logger.info(
        "request_finished",
        extra={"request_id": request_id, "status": response.status_code}
    )
    return response
```

## Health Check Endpoint

```python
from fastapi import FastAPI
from sqlalchemy import text

@app.get("/health")
async def health_check(db: Session = Depends(get_db)):
    # Check database connectivity
    try:
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception:
        db_status = "unhealthy"

    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "checks": {"database": db_status},
    }
```

## Key Takeaways

1. Use `logging.getLogger(__name__)` per module
2. Structured logging (JSON) works better in production
3. Log request IDs to trace requests through your system
4. Expose a `/health` endpoint for monitoring
5. Use different log levels: DEBUG (dev), INFO (prod)
