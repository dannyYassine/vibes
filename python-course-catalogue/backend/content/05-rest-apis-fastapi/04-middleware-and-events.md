---
title: "Middleware and Events"
description: "Process requests globally and manage application lifecycle with middleware and events."
duration_minutes: 25
order: 4
---

## What is Middleware?

Middleware intercepts every request and response:

```
Request → Middleware → Route Handler → Middleware → Response
```

## Basic Middleware

```python
from fastapi import FastAPI, Request
import time

app = FastAPI()

@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.perf_counter()
    response = await call_next(request)
    process_time = time.perf_counter() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response
```

## Common Middleware Patterns

### Logging Middleware

```python
import logging
from fastapi import Request

logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    logger.info(f"Request: {request.method} {request.url.path}")

    response = await call_next(request)

    logger.info(f"Response: {response.status_code}")
    return response
```

### Authentication Middleware

```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.middleware("http")
async def check_api_key(request: Request, call_next):
    # Skip for public paths
    if request.url.path in ["/", "/docs", "/openapi.json"]:
        return await call_next(request)

    api_key = request.headers.get("X-API-Key")
    if not api_key or api_key != "secret-key":
        return JSONResponse(
            status_code=403,
            content={"detail": "Invalid API key"}
        )

    return await call_next(request)
```

### Error Handling Middleware

```python
from fastapi import Request
from fastapi.responses import JSONResponse

@app.middleware("http")
async def catch_exceptions(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        logger.exception("Unhandled exception")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"}
        )
```

## Built-in Middleware

### CORS Middleware

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://myapp.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### GZip Compression

```python
from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(GZipMiddleware, minimum_size=1000)
```

### Trusted Host Middleware

```python
from fastapi.middleware.trustedhost import TrustedHostMiddleware

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["example.com", "*.example.com"]
)
```

## Class-Based Middleware

```python
from starlette.middleware.base import BaseHTTPMiddleware

class CustomMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, config_value: str):
        super().__init__(app)
        self.config_value = config_value

    async def dispatch(self, request: Request, call_next):
        # Before request
        request.state.custom_value = self.config_value

        response = await call_next(request)

        # After response
        response.headers["X-Custom"] = self.config_value
        return response

app.add_middleware(CustomMiddleware, config_value="hello")
```

## Application Lifecycle Events

### Startup and Shutdown

```python
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Starting up...")
    app.state.db = await create_db_pool()
    app.state.cache = await create_redis_connection()

    yield

    # Shutdown
    print("Shutting down...")
    await app.state.db.close()
    await app.state.cache.close()

app = FastAPI(lifespan=lifespan)
```

### Accessing App State

```python
@app.get("/items")
async def list_items(request: Request):
    db = request.app.state.db
    return await db.fetch_all("SELECT * FROM items")
```

## Background Tasks

```python
from fastapi import BackgroundTasks

def send_email(email: str, message: str):
    # Simulate sending email
    print(f"Sending email to {email}: {message}")

@app.post("/users")
async def create_user(
    user: UserCreate,
    background_tasks: BackgroundTasks
):
    # Create user in database
    db_user = create_user_in_db(user)

    # Send welcome email in background
    background_tasks.add_task(
        send_email,
        user.email,
        "Welcome to our platform!"
    )

    return db_user
```

### Multiple Background Tasks

```python
@app.post("/orders")
async def create_order(
    order: Order,
    background_tasks: BackgroundTasks
):
    db_order = save_order(order)

    background_tasks.add_task(send_confirmation_email, order.user_email)
    background_tasks.add_task(update_inventory, order.items)
    background_tasks.add_task(notify_warehouse, db_order.id)

    return db_order
```

## Request State

Store data during request lifecycle:

```python
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    import uuid
    request.state.request_id = str(uuid.uuid4())
    response = await call_next(request)
    response.headers["X-Request-ID"] = request.state.request_id
    return response

@app.get("/items")
async def list_items(request: Request):
    request_id = request.state.request_id
    logger.info(f"[{request_id}] Listing items")
    return []
```

## Custom Exception Handlers

```python
from fastapi import HTTPException
from fastapi.responses import JSONResponse

class CustomException(Exception):
    def __init__(self, name: str):
        self.name = name

@app.exception_handler(CustomException)
async def custom_exception_handler(request: Request, exc: CustomException):
    return JSONResponse(
        status_code=418,
        content={"message": f"Oops! {exc.name} did something wrong."}
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "path": request.url.path
        }
    )
```

## Middleware Order

Middleware executes in order added (first added = outermost):

```python
# Order: Auth → Logging → CORS → Route Handler → CORS → Logging → Auth

app.add_middleware(AuthMiddleware)      # 1st (outermost)
app.add_middleware(LoggingMiddleware)   # 2nd
app.add_middleware(CORSMiddleware, ...) # 3rd (innermost)
```

## Key Takeaways

1. Middleware processes all requests/responses
2. Use `@app.middleware("http")` for simple middleware
3. Use `lifespan` context manager for startup/shutdown
4. Background tasks run after response is sent
5. `request.state` stores per-request data
6. Middleware order matters — first added is outermost
