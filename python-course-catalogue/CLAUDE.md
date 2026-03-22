# Python Course – Project Summary for Claude

## What This Is
A full-stack Python learning platform. FastAPI backend + plain HTML/JS frontend. Dark VS Code-inspired theme.

## How to Run
```bash
cd /Users/dannyyassine/dev/python-course/backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
# Open http://localhost:8000
```

## Project Structure
```
python-course/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app, CORS, static mount, lifespan
│   │   ├── config.py            # pydantic-settings (reads .env)
│   │   ├── database.py          # SQLAlchemy SQLite engine, get_db()
│   │   ├── dependencies.py      # get_current_user() JWT dependency
│   │   ├── auth/                # models, schemas, service, router
│   │   ├── courses/             # content_loader, schemas, router
│   │   └── progress/            # models, schemas, service, router
│   ├── content/                 # 7 sections × 4-6 markdown lessons = 32 lessons
│   │   ├── 01-python-fundamentals/
│   │   ├── 02-intermediate-python/
│   │   ├── 03-advanced-python/
│   │   ├── 04-rest-apis-django/
│   │   ├── 05-rest-apis-fastapi/
│   │   ├── 06-production-practices/
│   │   └── 07-design-patterns/
│   ├── requirements.txt
│   ├── .env                     # Not committed – contains SECRET_KEY etc.
│   └── .env.example
├── frontend/
│   ├── index.html               # Single HTML shell
│   ├── css/                     # variables, reset, layout, sidebar, auth,
│   │   │                        # components, dashboard, lesson
│   └── js/
│       ├── store.js             # In-memory reactive state
│       ├── auth.js              # Token storage (localStorage)
│       ├── api.js               # fetch() wrapper, Bearer injection, 401 handler
│       ├── router.js            # Hash router (#/dashboard, #/lesson/:s/:l)
│       ├── app.js               # Bootstrap: auth check, data load, router start
│       ├── pages/               # auth-page.js, dashboard.js, lesson.js
│       ├── components/          # sidebar.js, progress-ring.js, lesson-nav.js, toast.js
│       └── vendor/              # marked.min.js, prism.js, prism.css (vendored)
├── Dockerfile
├── docker-compose.yml
└── .gitignore
```

## Tech Stack
- **Backend**: FastAPI 0.110, SQLAlchemy 2.0, SQLite, python-jose JWT
- **Passwords**: bcrypt 4.1.3 used directly (passlib dropped — incompatible with bcrypt 4.x)
- **Content**: python-frontmatter parses YAML frontmatter from .md files, loaded into `COURSE_TREE` dict at startup
- **Frontend**: Vanilla JS, no framework, no bundler. marked.js (client-side markdown), Prism.js (syntax highlighting)

## Database
SQLite file: `backend/python_course.db` (auto-created on startup via `Base.metadata.create_all`)

Tables:
- `users` — id, email (unique), username (unique), hashed_password, created_at, is_active
- `user_progress` — id, user_id (FK), lesson_id (e.g. `"01-python-fundamentals/01-variables-and-types"`), completed_at. UNIQUE(user_id, lesson_id)

## API Routes
| Method | Path | Auth | Notes |
|--------|------|------|-------|
| POST | /api/auth/register | No | Returns JWT |
| POST | /api/auth/login | No | Returns JWT |
| GET | /api/auth/me | Yes | Current user |
| GET | /api/courses | Yes | All sections + lesson list (no markdown body) |
| GET | /api/courses/{section}/{lesson} | Yes | Lesson with raw_markdown, prev/next slugs |
| GET | /api/progress | Yes | completed_lessons[], sections{} with % |
| POST | /api/progress/{section}/{lesson} | Yes | Toggle complete, returns {completed: bool} |

## Frontend Architecture
- Auth overlay shown when no token in localStorage
- After login: loads `/api/auth/me`, `/api/courses`, `/api/progress` in parallel
- Hash router: `#/dashboard` → dashboardPage.render(), `#/lesson/s/l` → lessonPage.render()
- Store emits events on set(); sidebar re-renders on `courses`, `progress`, `user` changes
- Markdown rendered client-side by marked.js, then Prism.highlightAllUnder() called

## Content Format
Each .md file has YAML frontmatter:
```markdown
---
title: "Decorators in Python"
description: "..."
duration_minutes: 25
order: 1
---
## Content here...
```

Each section directory has `_section.json`:
```json
{ "title": "Intermediate Python", "description": "...", "order": 2 }
```

## Key Files to Know
- `backend/app/main.py` — app wiring, lifespan hook
- `backend/app/auth/service.py` — hash_password/verify_password (bcrypt direct), create/decode JWT
- `backend/app/courses/content_loader.py` — scans content/, builds COURSE_TREE global
- `frontend/js/app.js` — bootstrap entry point
- `frontend/js/api.js` — all API calls
- `frontend/css/sidebar.css` — sidebar styles (.lesson-item .lesson-title scoped to fix specificity conflict with lesson.css)
- `frontend/css/lesson.css` — .lesson-header .lesson-title (scoped to avoid overriding sidebar)

## Known Issues Fixed
- `passlib[bcrypt]` removed — passlib 1.7.4 incompatible with bcrypt 4.x. Now using `bcrypt` directly.
- `email-validator` added (required by pydantic EmailStr)
- `.lesson-title` CSS specificity conflict between `sidebar.css` and `lesson.css` — fixed by scoping both selectors

## Demo Accounts (created during testing)
- `test@example.com` / `testpass123`
- `user2@example.com` / `pass123456`

## Requirements File
```
fastapi==0.110.0
email-validator==2.1.1
bcrypt==4.1.3
uvicorn[standard]==0.29.0
sqlalchemy==2.0.28
alembic==1.13.1
pydantic-settings==2.2.1
python-jose[cryptography]==3.3.0
python-frontmatter==1.1.0
python-multipart==0.0.9
httpx==0.27.0
pytest==8.1.0
pytest-asyncio==0.23.5
```

## Things That Could Be Added Next
- Alembic migrations (currently using `create_all` — no migration history)
- Search across lesson content
- Code execution sandbox
- User notes per lesson
- Section completion certificates
- Mobile nav improvements
- pytest test suite for auth + progress endpoints
