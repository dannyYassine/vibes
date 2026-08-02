FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

COPY README.md ./
COPY src ./src/
RUN uv sync --frozen --no-dev

ENV PYTHONUNBUFFERED=1

CMD ["uv", "run", "console-ai-chat"]