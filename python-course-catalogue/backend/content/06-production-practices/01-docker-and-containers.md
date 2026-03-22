---
title: "Docker and Containers"
description: "Package Python applications in containers for consistent deployments."
duration_minutes: 35
order: 1
---

## Why Docker?

Docker solves "it works on my machine" by packaging:
- Your application code
- Python runtime
- All dependencies
- System configuration

Into a portable, reproducible container.

## Dockerfile Basics

```dockerfile
# Dockerfile
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install dependencies first (for caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Building Images

```bash
# Build image
docker build -t myapp:latest .

# Build with specific Dockerfile
docker build -f Dockerfile.prod -t myapp:prod .

# Build with build arguments
docker build --build-arg ENV=production -t myapp:prod .
```

## Running Containers

```bash
# Run container
docker run -p 8000:8000 myapp:latest

# Run in background
docker run -d -p 8000:8000 --name myapp myapp:latest

# Run with environment variables
docker run -d -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  -e SECRET_KEY=mysecret \
  myapp:latest

# Run with volume mount
docker run -d -p 8000:8000 \
  -v $(pwd)/data:/app/data \
  myapp:latest
```

## Multi-Stage Builds

Reduce image size by separating build and runtime:

```dockerfile
# Build stage
FROM python:3.12 AS builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Runtime stage
FROM python:3.12-slim

WORKDIR /app

# Copy only installed packages
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Production Dockerfile

```dockerfile
FROM python:3.12-slim AS base

# Prevent Python from writing .pyc files
ENV PYTHONDONTWRITEBYTECODE=1
# Prevent Python from buffering stdout/stderr
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Create non-root user
RUN adduser --disabled-password --gecos "" appuser

# Install dependencies
FROM base AS deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Final stage
FROM base AS final
COPY --from=deps /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

COPY --chown=appuser:appuser . .

USER appuser

EXPOSE 8000
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "-b", "0.0.0.0:8000"]
```

## Docker Compose

Orchestrate multiple services:

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
    volumes:
      - ./app:/app/app  # Development hot reload

  db:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### Compose Commands

```bash
# Start services
docker compose up

# Start in background
docker compose up -d

# Build and start
docker compose up --build

# Stop services
docker compose down

# View logs
docker compose logs -f web

# Run command in service
docker compose exec web python manage.py migrate

# Scale service
docker compose up -d --scale worker=3
```

## Development vs Production

```yaml
# docker-compose.yml (base)
services:
  web:
    build: .
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/myapp

# docker-compose.override.yml (development - auto-loaded)
services:
  web:
    volumes:
      - .:/app
    command: uvicorn app.main:app --reload --host 0.0.0.0

# docker-compose.prod.yml
services:
  web:
    command: gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
    restart: always
```

```bash
# Development (uses override automatically)
docker compose up

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Health Checks

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1
```

```yaml
# docker-compose.yml
services:
  web:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```python
# app/main.py
@app.get("/health")
def health_check():
    return {"status": "healthy"}
```

## .dockerignore

```
# .dockerignore
.git
.gitignore
.env
.venv
__pycache__
*.pyc
*.pyo
.pytest_cache
.mypy_cache
*.md
Dockerfile*
docker-compose*
.dockerignore
tests/
```

## Container Management

```bash
# List containers
docker ps
docker ps -a  # Include stopped

# Stop container
docker stop myapp

# Remove container
docker rm myapp

# View logs
docker logs myapp
docker logs -f myapp  # Follow

# Execute command
docker exec -it myapp bash
docker exec myapp python manage.py migrate

# Inspect container
docker inspect myapp
```

## Key Takeaways

1. Dockerfiles define how to build images
2. Multi-stage builds reduce image size
3. Run as non-root user in production
4. Docker Compose orchestrates multiple services
5. Use `.dockerignore` to exclude unnecessary files
6. Health checks enable container orchestration
