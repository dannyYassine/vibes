FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN pip install --upgrade uv

COPY pyproject.toml ./
RUN uv sync

# Playwright + chromium deps (ARM64-ok on >=1.40)
RUN uv run playwright install --with-deps chromium

COPY . .

EXPOSE 8000

CMD ["uv", "run", "python", "budget/manage.py", "runserver", "0.0.0.0:8000"]