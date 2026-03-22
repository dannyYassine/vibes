FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy frontend
COPY frontend/ ./frontend/

# Set working directory to backend (where uvicorn runs)
WORKDIR /app/backend

# Create directory for SQLite database
RUN mkdir -p /data

ENV DATABASE_URL="sqlite:////data/bytebytego_ai.db"
ENV CONTENT_DIR="./content"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
