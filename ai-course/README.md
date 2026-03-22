# ByteByteGo AI Course

A self-hosted AI course platform covering fundamentals to expert-level techniques. Built with a FastAPI backend serving markdown-based lessons and a vanilla JavaScript frontend with progress tracking.

![Dashboard](assets/dashboard.png)

## Course Modules

1. **LLM Foundations** — Understand how large language models work from data collection to deployment
2. **RAGs & Prompt Engineering** — Retrieval-augmented generation, finetuning, and prompt engineering techniques
3. **AI Agents** — Build autonomous agents with workflows, tools, and multi-agent coordination
4. **Reasoning Models** — Inference-time scaling, chain-of-thought, and advanced reasoning techniques
5. **Multi-modal Generation** — Image and video generation with VAEs, GANs, diffusion models, and beyond
6. **Capstone Project** — Build and present a production-ready AI system

## Tech Stack

- **Backend:** Python / FastAPI / SQLite / SQLAlchemy
- **Frontend:** Vanilla JavaScript, CSS
- **Auth:** JWT-based authentication
- **Content:** Markdown lessons loaded at startup

## Getting Started

### With Docker

```bash
docker compose up --build
```

The app will be available at `http://localhost:8000`.

### Without Docker

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Configuration

| Variable | Description | Default |
|---|---|---|
| `SECRET_KEY` | JWT signing key | `change-me-in-production` |
| `DATABASE_URL` | SQLite connection string | `sqlite:///./bytebytego_ai.db` |
| `CONTENT_DIR` | Path to markdown content | `./content` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry | `10080` (7 days) |

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── auth/          # Authentication (JWT)
│   │   ├── courses/       # Course & lesson API
│   │   ├── progress/      # Progress tracking
│   │   ├── main.py
│   │   ├── config.py
│   │   └── database.py
│   └── content/           # Markdown course content
├── frontend/
│   ├── index.html
│   ├── css/
│   └── js/
├── Dockerfile
└── docker-compose.yml
```
