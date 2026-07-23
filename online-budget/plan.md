# RBC Household Budget App — Verbose Implementation Plan

> Audience: an automated coding model (deepseek-v4-flash) implementing this with minimal human judgment. Every step below specifies the exact files to create, their full contents, and the shell command to verify. Execute in order. Do not skip steps. Do not improvise architecture — follow the layering rules exactly.

---

## Layering Rules (read before writing any code)

The codebase follows a strict clean-architecture layering. Dependencies flow one direction only:

```
delivery mechanisms (views, jobs, commands)
        ↓ build DTO, call one usecase
application (use cases)
        ↓ call
services (core/domain)
        ↓ call
repositories, factories, handlers
        ↓ hydrate / create
models (domain entities)
```

Hard rules — violate these and the build is wrong:

1. **One use case per request.** A view or job builds exactly one DTO and calls exactly one `usecase.execute(dto)`. Never two.
2. **Views never touch repositories.** Views call use cases only.
3. **Use cases never import Django.** They take ports (ABCs) as constructor args. Django lives only in `infrastructure/`.
4. **Repositories return domain entities**, never ORM models. Hydrate via `Entity.fromDatabase(row)`.
5. **Handlers are pure functions**, constructed with plain vars, never DI-registered. Only their paired service-helper may call them — but for v1 we treat `ExactMatcher` / `TitleNormalizer` as standalone handlers called by `CategorizationService`.
6. **DTOs are data only.** No methods. Built by the delivery mechanism, passed to `usecase.execute(dto)`.
7. **Presenters never call services/repositories.** They take use-case output, build a ViewModel, pick a Component.
8. **Templates read `vm.*` only.** No computation, no formatting in templates.
9. **`AUTO_APPROVE_THRESHOLD` is a class attribute on `AutoCategorizeUseCase`**, not a Django setting.
10. **Credentials never committed, never logged.** `.env` only, gitignored.

Reference (for humans): `.claude/skills/backend-architecture/SKILL.md` — framework specifics: `.claude/skills/backend-architecture/frameworks/django.md`.

---

## Tech Stack (locked, do not change)

- Python 3.12
- Django 5.x LTS
- django-q2 (not django-q) — ORM broker
- django-components — HTMX fragment components
- django-environ — settings from `.env`
- HTMX 2.x, Alpine.js 3.x, DaisyUI 4.x (Tailwind 3.x plugin) — via CDN in dev
- Playwright Python ≥1.40 (ARM64 chromium)
- Postgres 16
- pytest + pytest-django + factory-boy
- uv for Python packaging
- DI: **manual `Provider` dict** in `budget/budget/application/container.py` (no `django-injector` dep — 4 use cases is small)

---

## Execution Order (follow top to bottom)

```
Step 0  Repo bootstrap
Step 1  Django project skeleton + settings
Step 2  Domain layer (pure Python)
Step 3  Application layer (ports, DTOs, use cases, matching handlers)
Step 4  Services layer
Step 5  DI container
Step 6  Infrastructure: Django models + migrations
Step 7  Infrastructure: repositories
Step 8  Infrastructure: RBC scraper (Playwright) + CSV parser
Step 9  Infrastructure: Django-Q2 jobs
Step 10 Interface: presenters + view models
Step 11 Interface: django-components
Step 12 Interface: views + URL routing
Step 13 Auth wiring
Step 14 docker-compose
Step 15 Tests
Step 16 Final verification
```

Steps 2–5 have zero Django imports and can be unit-tested in isolation. Do them first and run their tests before touching Django.

---

# Step 0 — Repo Bootstrap

## 0.1 Directory

The repo root is `/Users/dannyyassine/dev/vibes/online-budget`. `plan.html` and `plan.md` already exist there. Do not delete them.

Create the tree below (empty files unless a content block is given). Run:

```bash
mkdir -p budget/budget/settings \
         budget/budget/domain \
         budget/budget/application/matching \
         budget/budget/services \
         budget/budget/infrastructure/rbc \
         budget/budget/infrastructure/jobs \
         budget/budget/interfaces/views \
         budget/budget/interfaces/components/templates \
         budget/budget/templates \
         budget/budget/static/budget \
         tests/unit tests/integration tests/functional \
         samples \
         compose/db
```

## 0.2 `.gitignore`

```
# Python
__pycache__/
*.py[cod]
.venv/
venv/
*.egg-info/
dist/
build/

# Env / secrets
.env
.env.local
*.local

# DB
*.sqlite3
db.sqlite3
postgres-data/

# Playwright
.playwright/
playwright-report/
test-results/

# Editors
.vscode/
.idea/
.DS_Store

# Django
*.log
local_settings.py
media/
```

## 0.3 `.env.example`

```
# Django
DJANGO_SETTINGS_MODULE=budget.settings.dev
SECRET_KEY=change-me-in-prod
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=postgres://budget:budget_dev@localhost:5432/budget

# RBC scraper — fill in dev, never commit
RBC_USERNAME=
RBC_PASSWORD=

# Django-Q2
Q_CLUSTER_NAME=budget-cluster
```

## 0.4 `pyproject.toml`

```toml
[project]
name = "online-budget"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "Django>=5.0,<5.2",
    "django-environ>=0.11",
    "django-q2>=1.6",
    "django-components>=0.60",
    "psycopg[binary]>=3.1",
    "playwright>=1.40",
    "python-money>=0.9",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-django>=4.8",
    "pytest-playwright>=0.4",
    "factory-boy>=3.3",
    "ruff>=0.5",
]

[tool.pytest.ini_options]
DJANGO_SETTINGS_MODULE = "budget.settings.test"
python_files = ["test_*.py"]
addopts = "-ra --strict-markers"

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E","F","I","B","UP"]
```

## 0.5 `requirements/` (mirror of pyproject for Docker layer caching)

Create `requirements/base.txt`, `requirements/dev.txt`, `requirements/prod.txt` — but since `uv` reads from `pyproject.toml`, these can be thin re-exports. Minimal:

`requirements/base.txt`:
```
-r base via uv sync --no-dev
```

If you prefer pip-based Docker builds, instead list each package with `==` pins resolved via `uv pip compile pyproject.toml -o requirements/base.txt`. The implementer may choose either path as long as Docker builds.

## 0.6 Install + verify

```bash
uv sync
uv run python -c "import django; print(django.get_version())"
uv run playwright install chromium
```

Expected: Django version printed, chromium browser downloaded.

---

# Step 1 — Django Project Skeleton + Settings

## 1.1 `budget/budget/__init__.py`

```python
```
(empty — package marker)

## 1.2 `budget/manage.py`

```python
#!/usr/bin/env python
import os
import sys


def main():
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "budget.settings.dev")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
```

## 1.3 `budget/budget/settings/__init__.py`

```python
```

## 1.4 `budget/budget/settings/base.py`

```python
import os
import environ

env = environ.Env(
    DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, []),
)
environ.Env.read_env(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"))

BASE_DIR = environ.Path(__file__) - 3

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = env("ALLOWED_HOSTS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_components",
    "django_q",
    "budget.budget",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "budget.budget.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR("budget/budget/templates")],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "budget.budget.wsgi.application"

DATABASES = {
    "default": env.db("DATABASE_URL"),
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "America/Toronto"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR("staticfiles")
STATICFILES_DIRS = [BASE_DIR("budget/budget/static")]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

LOGIN_URL = "/login/"
LOGIN_REDIRECT_URL = "/"

# Django-Q2 — ORM broker, no Redis
Q_CLUSTER = {
    "name": env("Q_CLUSTER_NAME", default="budget-cluster"),
    "workers": 2,
    "recycle": 500,
    "timeout": 600,   # Playwright login can be slow
    "retry": 120,
    "broker": "djangoorm",
    "queue_limit": 10,
    "bulk": 5,
    "orm": "default",
}
```

## 1.5 `budget/budget/settings/dev.py`

```python
from .base import *  # noqa

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]
```

## 1.6 `budget/budget/settings/prod.py`

```python
from .base import *  # noqa

DEBUG = False
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=[])
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

## 1.7 `budget/budget/settings/test.py`

```python
from .base import *  # noqa

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "budget_test",
        "USER": env("DATABASE_URL").split("//")[1].split(":")[0] if "DATABASE_URL" in os.environ else "budget",
        "PASSWORD": "budget_dev",
        "HOST": "localhost",
        "PORT": "5432",
    }
}

# Faster password hashing for tests
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
```

## 1.8 `budget/budget/urls.py` (placeholder, fleshed out in Step 12)

```python
from django.contrib import admin
from django.urls import path

urlpatterns = [
    path("admin/", admin.site.urls),
]
```

## 1.9 `budget/budget/wsgi.py` + `asgi.py`

```python
# wsgi.py
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "budget.settings.dev")
application = get_wsgi_application()
```

```python
# asgi.py
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "budget.settings.dev")
application = get_asgi_application()
```

## 1.10 `budget/budget/apps.py`

```python
from django.apps import AppConfig


class BudgetConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "budget.budget"

    def ready(self):
        # Register Django-Q2 scheduled sync (idempotent)
        from django_q.models import Schedule
        from budget.budget.infrastructure.jobs.schedule import register_schedules
        register_schedules(Schedule)
```

## 1.11 Verify

```bash
uv run python manage.py check
```

Expected: `System check identified no issues`. If migrations for `django_q` are missing, run `uv run python manage.py migrate` against a running Postgres first (Step 14 sets up compose). For now, `check` should pass for code errors.

---

# Step 2 — Domain Layer (pure Python)

All files in `budget/budget/domain/`. No Django imports. No `models.Model`.

## 2.1 `__init__.py`

```python
```

## 2.2 `value_objects.py`

```python
from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Money:
    amount: Decimal

    @classmethod
    def from_str(cls, raw: str) -> "Money":
        # RBC CSV uses "1,234.56" or "-1,234.56" — strip thousands separators
        cleaned = raw.replace(",", "")
        return cls(Decimal(cleaned))

    @property
    def is_credit(self) -> bool:
        return self.amount >= 0


@dataclass(frozen=True)
class NormalizedTitle:
    value: str


@dataclass(frozen=True)
class TransactionDate:
    value: str  # ISO YYYY-MM-DD
```

## 2.3 `entities.py`

```python
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import Optional

from .value_objects import Money, NormalizedTitle


@dataclass
class Category:
    id: Optional[int] = None
    name: str = ""
    color: str = "#999999"

    @classmethod
    def fromDatabase(cls, row) -> "Category":
        return cls(id=row.id, name=row.name, color=row.color)


@dataclass
class CategoryRule:
    id: Optional[int] = None
    match_key: str = ""               # NormalizedTitle.value
    category_id: int = 0
    times_confirmed: int = 0

    @classmethod
    def fromDatabase(cls, row) -> "CategoryRule":
        return cls(
            id=row.id,
            match_key=row.match_key,
            category_id=row.category_id,
            times_confirmed=row.times_confirmed,
        )


@dataclass
class Transaction:
    id: Optional[int] = None
    rbc_transaction_id: str = ""
    posted_date: date = None
    description_raw: str = ""
    description_normalized: str = ""
    amount: Money = field(default_factory=lambda: Money(Decimal("0")))
    category: Optional[Category] = None
    categorization_status: str = "pending"   # "auto" | "manual" | "pending"
    approved_at: Optional[str] = None        # ISO timestamp

    @classmethod
    def fromDatabase(cls, row) -> "Transaction":
        return cls(
            id=row.id,
            rbc_transaction_id=row.rbc_transaction_id,
            posted_date=row.posted_date,
            description_raw=row.description_raw,
            description_normalized=row.description_normalized,
            amount=Money(row.amount),
            category=Category.fromDatabase(row.category) if row.category_id else None,
            categorization_status=row.categorization_status,
            approved_at=row.approved_at.isoformat() if row.approved_at else None,
        )


@dataclass
class MonthlySummary:
    year: int
    month: int
    total_income: Money
    total_expense: Money
    categories: list  # list[CategoryTotal]


@dataclass
class CategoryTotal:
    category: Category
    amount: Money
    percentage: Decimal
```

## 2.4 `exceptions.py`

```python
class BudgetError(Exception):
    """Base."""


class CategoryNotFound(BudgetError):
    pass


class RuleConflict(BudgetError):
    pass


class SyncFailed(BudgetError):
    pass


class RBCLoginError(SyncFailed):
    pass
```

## 2.5 Verify (no Django yet)

```bash
uv run python -c "from budget.budget.domain.entities import Transaction, Category, CategoryRule; print('ok')"
```

Expected: `ok`.

---

# Step 3 — Application Layer

`budget/budget/application/`. No Django imports.

## 3.1 `__init__.py`

```python
```

## 3.2 `ports.py`

```python
from abc import ABC, abstractmethod
from datetime import date
from typing import Optional

from budget.budget.domain.entities import (
    Category, CategoryRule, MonthlySummary, Transaction,
)


class TransactionRepository(ABC):
    @abstractmethod
    def save(self, tx: Transaction) -> Transaction: ...
    @abstractmethod
    def get(self, tx_id: int) -> Transaction: ...
    @abstractmethod
    def list_pending(self) -> list[Transaction]: ...
    @abstractmethod
    def list_for_month(self, year: int, month: int) -> list[Transaction]: ...
    @abstractmethod
    def update_category(self, tx_id: int, category_id: int, status: str) -> Transaction: ...
    @abstractmethod
    def exists(self, rbc_transaction_id: str) -> bool: ...


class CategoryRuleRepository(ABC):
    @abstractmethod
    def find_by_match_key(self, key: str) -> Optional[CategoryRule]: ...
    @abstractmethod
    def save(self, rule: CategoryRule) -> CategoryRule: ...
    @abstractmethod
    def increment_confirmed(self, rule_id: int) -> None: ...


class CategoryRepository(ABC):
    @abstractmethod
    def get(self, category_id: int) -> Category: ...
    @abstractmethod
    def list_all(self) -> list[Category]: ...


class RBCScraper(ABC):
    @abstractmethod
    def scrape(self, since: date) -> list[dict]: ...
        # returns list of raw dicts:
        # {rbc_transaction_id, posted_date, description_raw, amount_str}
```

## 3.3 `dtos.py`

```python
from dataclasses import dataclass
from datetime import date


@dataclass
class SyncTransactionsDto:
    sync_since: date


@dataclass
class AutoCategorizeDto:
    pass  # no args; processes all pending


@dataclass
class ApproveCategorizationDto:
    transaction_id: int
    category_id: int


@dataclass
class GetMonthlySummaryDto:
    year: int
    month: int


@dataclass
class GetReviewQueueDto:
    pass
```

## 3.4 `matching/__init__.py`

```python
```

## 3.5 `matching/normalizer.py`

```python
import re

from budget.budget.domain.value_objects import NormalizedTitle


# TODO: sample-driven normalization. Until samples/rbc_descriptions.txt has 30+
# real RBC transactions, this returns identity (raw string lowercased).
#
# Suggested pipeline (validate against real samples before enabling):
#   1. lowercase
#   2. strip store numbers: r"#\d+"
#   3. strip trailing reference codes / dates
#   4. collapse whitespace
#
# Confirm normalization rule against samples, then enable below.

_STORE_NUM = re.compile(r"#\d+")
_REF_CODES = re.compile(r"\b[A-Z]{2,}\d{4,}\b")
_MULTI_WS = re.compile(r"\s+")


def normalize(raw: str) -> NormalizedTitle:
    """Normalize a raw RBC transaction description for exact-match lookup.

    v1: identity (lowercased raw). Will be tightened once samples are in.
    """
    if not raw:
        return NormalizedTitle("")
    # Identity for now — see TODO above. Lowercasing is safe and reversible-ish.
    value = raw.strip().lower()
    return NormalizedTitle(value)


def normalize_strict(raw: str) -> NormalizedTitle:
    """Strict normalization — ENABLE ONLY after validating against samples.

    Kept here ready to swap in once samples/rbc_descriptions.txt is filled.
    """
    s = raw.lower()
    s = _STORE_NUM.sub("", s)
    s = _REF_CODES.sub("", s)
    s = _MULTI_WS.sub(" ", s).strip()
    return NormalizedTitle(s)
```

## 3.6 `matching/exact_matcher.py`

```python
from typing import Optional

from budget.budget.domain.entities import Category, CategoryRule
from budget.budget.domain.value_objects import NormalizedTitle


def match(
    normalized: NormalizedTitle,
    rules: dict[str, CategoryRule],
    categories: dict[int, Category],
) -> Optional[tuple[CategoryRule, Category]]:
    """Return (rule, category) if an exact match_key hit, else None.

    `rules` is a dict of match_key -> CategoryRule (preloaded by the service).
    `categories` is a dict of category_id -> Category.
    """
    key = normalized.value
    rule = rules.get(key)
    if rule is None:
        return None
    category = categories.get(rule.category_id)
    if category is None:
        return None
    return rule, category
```

## 3.7 `use_cases.py`

```python
from dataclasses import dataclass
from datetime import date
from typing import Optional

from budget.budget.application.dtos import (
    ApproveCategorizationDto, AutoCategorizeDto, GetMonthlySummaryDto,
    GetReviewQueueDto, SyncTransactionsDto,
)
from budget.budget.application.matching.normalizer import normalize
from budget.budget.application.ports import (
    CategoryRepository, CategoryRuleRepository, RBCScraper, TransactionRepository,
)
from budget.budget.domain.entities import Transaction
from budget.budget.domain.exceptions import CategoryNotFound, SyncFailed
from budget.budget.services.categorization_service import CategorizationService
from budget.budget.services.summary_service import SummaryService


@dataclass
class SyncResult:
    new_count: int
    skipped_count: int
    errors: list


class SyncTransactionsUseCase:
    def __init__(
        self,
        scraper: RBCScraper,
        repo: TransactionRepository,
        categorizer: CategorizationService,
    ):
        self._scraper = scraper
        self._repo = repo
        self._categorizer = categorizer

    def execute(self, dto: SyncTransactionsDto) -> SyncResult:
        try:
            raw_txs = self._scraper.scrape(dto.sync_since)
        except Exception as exc:
            raise SyncFailed(f"RBC scrape failed: {exc}") from exc

        new_ids = []
        skipped = 0
        errors = []
        for raw in raw_txs:
            rbc_id = raw["rbc_transaction_id"]
            if self._repo.exists(rbc_id):
                skipped += 1
                continue
            tx = self._categorizer.build_new_transaction(raw)
            saved = self._repo.save(tx)
            new_ids.append(saved.id)
        # Auto-categorize the newly imported batch
        self._categorizer.auto_categorize_pending()
        return SyncResult(new_count=len(new_ids), skipped_count=skipped, errors=errors)


@dataclass
class AutoCategorizeResult:
    auto_approved: int
    queued: int


class AutoCategorizeUseCase:
    # Per handoff: fixed code constant. For exact-match-only v1, "match found"
    # = auto-approve; "no match" = queue. This constant is the threshold for
    # times_confirmed at which a rule auto-approves without manual review.
    # With exact-match-only, any existing rule auto-approves (threshold = 1).
    AUTO_APPROVE_THRESHOLD = 1

    def __init__(self, categorizer: CategorizationService, repo: TransactionRepository):
        self._categorizer = categorizer
        self._repo = repo

    def execute(self, dto: AutoCategorizeDto) -> AutoCategorizeResult:
        return self._categorizer.auto_categorize_pending()


@dataclass
class ApproveResult:
    transaction: Transaction
    rule_reinforced: bool


class ApproveCategorizationUseCase:
    def __init__(
        self,
        tx_repo: TransactionRepository,
        rule_repo: CategoryRuleRepository,
        categorizer: CategorizationService,
    ):
        self._tx_repo = tx_repo
        self._rule_repo = rule_repo
        self._categorizer = categorizer

    def execute(self, dto: ApproveCategorizationDto) -> ApproveResult:
        tx = self._tx_repo.update_category(
            dto.transaction_id, dto.category_id, status="manual"
        )
        reinforced = self._categorizer.reinforce_rule(
            tx.description_normalized, dto.category_id
        )
        return ApproveResult(transaction=tx, rule_reinforced=reinforced)


class GetMonthlySummaryUseCase:
    def __init__(self, summary_service: SummaryService):
        self._summary = summary_service

    def execute(self, dto: GetMonthlySummaryDto):
        return self._summary.build(dto.year, dto.month)


class GetReviewQueueUseCase:
    def __init__(self, tx_repo: TransactionRepository, cat_repo: CategoryRepository):
        self._tx_repo = tx_repo
        self._cat_repo = cat_repo

    def execute(self, dto: GetReviewQueueDto):
        pending = self._tx_repo.list_pending()
        categories = self._cat_repo.list_all()
        return pending, categories
```

---

# Step 4 — Services Layer

`budget/budget/services/`. No Django imports.

## 4.1 `__init__.py`

```python
```

## 4.2 `categorization_service.py`

```python
from datetime import date
from decimal import Decimal
from typing import Optional

from budget.budget.application.matching.exact_matcher import match
from budget.budget.application.matching.normalizer import normalize
from budget.budget.application.ports import (
    CategoryRepository, CategoryRuleRepository, TransactionRepository,
)
from budget.budget.domain.entities import Category, CategoryRule, Transaction
from budget.budget.domain.value_objects import Money


class CategorizationService:
    def __init__(
        self,
        tx_repo: TransactionRepository,
        rule_repo: CategoryRuleRepository,
        cat_repo: CategoryRepository,
    ):
        self._tx_repo = tx_repo
        self._rule_repo = rule_repo
        self._cat_repo = cat_repo

    def build_new_transaction(self, raw: dict) -> Transaction:
        normalized = normalize(raw["description_raw"])
        return Transaction(
            rbc_transaction_id=raw["rbc_transaction_id"],
            posted_date=date.fromisoformat(raw["posted_date"]),
            description_raw=raw["description_raw"],
            description_normalized=normalized.value,
            amount=Money.from_str(raw["amount_str"]),
            categorization_status="pending",
        )

    def auto_categorize_pending(self):
        pending = self._tx_repo.list_pending()
        rules = {r.match_key: r for r in self._rule_repo.all_rules()} if hasattr(self._rule_repo, "all_rules") else self._load_rules()
        categories = {c.id: c for c in self._cat_repo.list_all()}
        auto_approved = 0
        queued = 0
        for tx in pending:
            norm = type(normalize(""))(tx.description_normalized)
            hit = match(norm, rules, categories)
            if hit is None:
                queued += 1
                continue
            rule, category = hit
            self._tx_repo.update_category(tx.id, category.id, status="auto")
            self._rule_repo.increment_confirmed(rule.id)
            auto_approved += 1
        from budget.budget.application.use_cases import AutoCategorizeResult
        return AutoCategorizeResult(auto_approved=auto_approved, queued=queued)

    def _load_rules(self) -> dict:
        # Fallback if repo doesn't expose all_rules(); see Step 7 which adds it.
        return {}

    def reinforce_rule(self, normalized_key: str, category_id: int) -> bool:
        existing = self._rule_repo.find_by_match_key(normalized_key)
        if existing is None:
            self._rule_repo.save(CategoryRule(
                match_key=normalized_key, category_id=category_id, times_confirmed=1
            ))
            return False  # new rule created, not reinforced
        self._rule_repo.increment_confirmed(existing.id)
        return True
```

## 4.3 `summary_service.py`

```python
from decimal import Decimal
from typing import List

from budget.budget.application.ports import CategoryRepository, TransactionRepository
from budget.budget.domain.entities import CategoryTotal, MonthlySummary
from budget.budget.domain.value_objects import Money


class SummaryService:
    def __init__(self, tx_repo: TransactionRepository, cat_repo: CategoryRepository):
        self._tx_repo = tx_repo
        self._cat_repo = cat_repo

    def build(self, year: int, month: int) -> MonthlySummary:
        txs = self._tx_repo.list_for_month(year, month)
        total_income = Money(sum((t.amount.amount for t in txs if t.amount.is_credit), Decimal("0")))
        total_expense = Money(sum((-t.amount.amount for t in txs if not t.amount.is_credit), Decimal("0")))
        by_cat: dict[int, Decimal] = {}
        for t in txs:
            if t.category is None:
                continue
            by_cat[t.category.id] = by_cat.get(t.category.id, Decimal("0")) + t.amount.amount
        totals = []
        denom = total_income.amount + abs(total_expense.amount) or Decimal("1")
        for cat in self._cat_repo.list_all():
            amt = by_cat.get(cat.id, Decimal("0"))
            totals.append(CategoryTotal(
                category=cat, amount=Money(amt), percentage=Decimal("0") if denom == 0 else (abs(amt) / denom * 100),
            ))
        return MonthlySummary(year=year, month=month, total_income=total_income, total_expense=total_expense, categories=totals)
```

---

# Step 5 — DI Container

`budget/budget/application/container.py`:

```python
"""Manual DI container. Build per request in views/jobs; one-shot at import for jobs.

Why not django-injector: 4 use cases is small; a manual dict is enough and
avoids an extra dependency. Revisit if the graph grows.
"""
from budget.budget.application.use_cases import (
    ApproveCategorizationUseCase, AutoCategorizeUseCase, GetMonthlySummaryUseCase,
    GetReviewQueueUseCase, SyncTransactionsUseCase,
)
from budget.budget.services.categorization_service import CategorizationService
from budget.budget.services.summary_service import SummaryService


def build_container():
    """Return a dict of use-case factories.

    Lazily imports infrastructure so domain/application stay Django-free.
    Views call e.g. container()["sync"](...) to get a wired use case.
    """
    from budget.budget.infrastructure.repositories import (
        DjangoCategoryRepository, DjangoCategoryRuleRepository, DjangoTransactionRepository,
    )
    from budget.budget.infrastructure.rbc.scraper import PlaywrightRBCScraper

    tx_repo = DjangoTransactionRepository()
    rule_repo = DjangoCategoryRuleRepository()
    cat_repo = DjangoCategoryRepository()
    scraper = PlaywrightRBCScraper()
    categorizer = CategorizationService(tx_repo, rule_repo, cat_repo)
    summarizer = SummaryService(tx_repo, cat_repo)

    return {
        "sync": lambda: SyncTransactionsUseCase(scraper, tx_repo, categorizer),
        "auto_categorize": lambda: AutoCategorizeUseCase(categorizer, tx_repo),
        "approve": lambda: ApproveCategorizationUseCase(tx_repo, rule_repo, categorizer),
        "monthly_summary": lambda: GetMonthlySummaryUseCase(summarizer),
        "review_queue": lambda: GetReviewQueueUseCase(tx_repo, cat_repo),
    }


_container = None


def container():
    global _container
    if _container is None:
        _container = build_container()
    return _container
```

---

# Step 6 — Infrastructure: Django Models + Migrations

`budget/budget/infrastructure/`. These files DO import Django.

## 6.1 `__init__.py`

```python
```

## 6.2 `django_models.py`

```python
from django.db import models


class CategoryModel(models.Model):
    name = models.CharField(max_length=80, unique=True)
    color = models.CharField(max_length=7, default="#999999")

    class Meta:
        db_table = "budget_category"

    def __str__(self):
        return self.name


class CategoryRuleModel(models.Model):
    match_key = models.CharField(max_length=200, unique=True, db_index=True)
    category = models.ForeignKey(CategoryModel, on_delete=models.PROTECT, related_name="rules")
    times_confirmed = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "budget_category_rule"
        indexes = [models.Index(fields=["match_key"])]


class TransactionModel(models.Model):
    class Status(models.TextChoices):
        AUTO = "auto", "Auto"
        MANUAL = "manual", "Manual"
        PENDING = "pending", "Pending"

    rbc_transaction_id = models.CharField(max_length=120, unique=True)
    posted_date = models.DateField(db_index=True)
    description_raw = models.TextField()
    description_normalized = models.CharField(max_length=200, db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(CategoryModel, null=True, blank=True, on_delete=models.SET_NULL)
    categorization_status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    approved_at = models.DateTimeField(null=True, blank=True)
    imported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "budget_transaction"
        ordering = ["-posted_date", "-id"]
```

## 6.3 Migrations

Run after Postgres is up (Step 14):

```bash
uv run python manage.py makemigrations budget
uv run python manage.py migrate
```

The app label is `budget` (from `BudgetConfig.name = "budget.budget"`; Django uses the last path segment). Confirm with `makemigrations budget` — if Django complains, use `makemigrations budget.budget` and adjust `default_app_label` on the AppConfig.

---

# Step 7 — Infrastructure: Repositories

## 7.1 `repositories.py`

```python
from datetime import date
from typing import Optional

from django.utils import timezone

from budget.budget.application.ports import (
    CategoryRepository, CategoryRuleRepository, TransactionRepository,
)
from budget.budget.domain.entities import Category, CategoryRule, Transaction
from budget.budget.domain.value_objects import Money

from .django_models import CategoryModel, CategoryRuleModel, TransactionModel


class DjangoTransactionRepository(TransactionRepository):
    def save(self, tx: Transaction) -> Transaction:
        row = TransactionModel.objects.create(
            rbc_transaction_id=tx.rbc_transaction_id,
            posted_date=tx.posted_date,
            description_raw=tx.description_raw,
            description_normalized=tx.description_normalized,
            amount=tx.amount.amount,
            categorization_status=tx.categorization_status,
        )
        return Transaction.fromDatabase(row)

    def get(self, tx_id: int) -> Transaction:
        return Transaction.fromDatabase(TransactionModel.objects.get(id=tx_id))

    def list_pending(self) -> list[Transaction]:
        rows = TransactionModel.objects.filter(categorization_status="pending")
        return [Transaction.fromDatabase(r) for r in rows]

    def list_for_month(self, year: int, month: int) -> list[Transaction]:
        rows = TransactionModel.objects.filter(posted_date__year=year, posted_date__month=month)
        return [Transaction.fromDatabase(r) for r in rows]

    def update_category(self, tx_id: int, category_id: int, status: str) -> Transaction:
        row = TransactionModel.objects.get(id=tx_id)
        row.category_id = category_id
        row.categorization_status = status
        row.approved_at = timezone.now() if status != "pending" else None
        row.save()
        return Transaction.fromDatabase(row)

    def exists(self, rbc_transaction_id: str) -> bool:
        return TransactionModel.objects.filter(rbc_transaction_id=rbc_transaction_id).exists()


class DjangoCategoryRuleRepository(CategoryRuleRepository):
    def find_by_match_key(self, key: str) -> Optional[CategoryRule]:
        row = CategoryRuleModel.objects.filter(match_key=key).first()
        return CategoryRule.fromDatabase(row) if row else None

    def save(self, rule: CategoryRule) -> CategoryRule:
        row = CategoryRuleModel.objects.create(
            match_key=rule.match_key,
            category_id=rule.category_id,
            times_confirmed=rule.times_confirmed,
        )
        return CategoryRule.fromDatabase(row)

    def increment_confirmed(self, rule_id: int) -> None:
        CategoryRuleModel.objects.filter(id=rule_id).update(
            times_confirmed=models.F("times_confirmed") + 1
        )  # NOTE: import django.db.models as models at top of file

    def all_rules(self) -> list[CategoryRule]:
        return [CategoryRule.fromDatabase(r) for r in CategoryRuleModel.objects.all()]


class DjangoCategoryRepository(CategoryRepository):
    def get(self, category_id: int) -> Category:
        return Category.fromDatabase(CategoryModel.objects.get(id=category_id))

    def list_all(self) -> list[Category]:
        return [Category.fromDatabase(c) for c in CategoryModel.objects.all().order_by("name")]
```

> **IMPORTANT**: add `from django.db.models import F` at the top and use `F("times_confirmed") + 1` in `increment_confirmed`. The inline `models.F` reference above is illustrative; the final file must import it.

---

# Step 8 — RBC Scraper + CSV Parser

## 8.1 `infrastructure/rbc/__init__.py`

```python
```

## 8.2 `selectors.py`

```python
# All RBC selectors live here. When RBC changes its UI, patch this one file.
USERNAME_INPUT = 'input[name="username"]'
PASSWORD_INPUT = 'input[name="password"]'
SIGN_IN_BUTTON = 'button[type="submit"]'
ACCOUNTS_TABLE = 'table.accounts-list'
JOINT_CHEQUING_LINK = 'a:has-text("Chequing")'
EXPORT_BUTTON = 'button:has-text("Export")'
FORMAT_CSV_RADIO = 'input[value="csv"]'
DATE_FROM_INPUT = 'input[name="fromDate"]'
DATE_TO_INPUT = 'input[name="toDate"]'
DOWNLOAD_BUTTON = 'button:has-text("Download")'
MFA_PROMPT = '.mfa-challenge'  # may need manual intervention on first run
```

## 8.3 `scraper.py`

```python
import os
from datetime import date, timedelta
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

from budget.budget.application.ports import RBCScraper
from budget.budget.domain.exceptions import RBCLoginError, SyncFailed

from . import selectors as S
from .csv_parser import parse_csv


class PlaywrightRBCScraper(RBCScraper):
    """Logs into RBC, exports the joint chequing CSV, parses it.

    Credentials come from env (RBC_USERNAME, RBC_PASSWORD) — never logged.
    Runs headless in prod; pass headless=False in dev for debugging.
    """

    DOWNLOAD_DIR = Path(os.environ.get("RBC_DOWNLOAD_DIR", "/tmp/rbc_exports"))

    def __init__(self, headless: bool = True):
        self._headless = headless
        self.DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

    def scrape(self, since: date) -> list[dict]:
        username = os.environ.get("RBC_USERNAME")
        password = os.environ.get("RBC_PASSWORD")
        if not username or not password:
            raise SyncFailed("RBC_USERNAME / RBC_PASSWORD not set in env")

        try:
            with sync_playwright() as pw:
                browser = pw.chromium.launch(headless=self._headless)
                ctx = browser.new_context(accept_downloads=True)
                page = ctx.new_page()

                page.goto("https://www1.rbc.com/onlinebanking/")
                page.fill(S.USERNAME_INPUT, username)
                page.fill(S.PASSWORD_INPUT, password)
                page.click(S.SIGN_IN_BUTTON)

                # If MFA appears, raise — first-run must be handled manually
                try:
                    page.wait_for_selector(S.MFA_PROMPT, timeout=4000)
                    raise RBCLoginError("MFA challenge — complete first login manually, then retry")
                except PlaywrightTimeout:
                    pass  # no MFA, proceed

                page.wait_for_selector(S.ACCOUNTS_TABLE, timeout=15000)
                page.click(S.JOINT_CHEQUING_LINK)
                page.wait_for_selector(S.EXPORT_BUTTON, timeout=15000)
                page.click(S.EXPORT_BUTTON)

                page.check(S.FORMAT_CSV_RADIO)
                page.fill(S.DATE_FROM_INPUT, since.isoformat())
                page.fill(S.DATE_TO_INPUT, date.today().isoformat())

                with page.expect_download(timeout=30000) as dl_info:
                    page.click(S.DOWNLOAD_BUTTON)
                download = dl_info.value
                save_path = self.DOWNLOAD_DIR / download.suggested_filename
                download.save_as(str(save_path))

                browser.close()
                return parse_csv(save_path)
        except (RBCLoginError, SyncFailed):
            raise
        except Exception as exc:
            raise SyncFailed(f"Scraper error: {exc}") from exc
```

## 8.4 `csv_parser.py`

```python
import csv
from pathlib import Path

from budget.budget.domain.exceptions import SyncFailed


# RBC CSV export columns — confirm against a real export before relying on this.
# Common RBC chequing export columns:
#   "Account Type","Account Number","Transaction Date","Cheque Number",
#   "Description 1","Description 2","CAD$","USD$"
EXPECTED_HEADERS = {
    "Transaction Date",
    "Description 1",
    "CAD$",
}


def parse_csv(path: Path) -> list[dict]:
    """Parse an RBC CSV export into raw transaction dicts.

    Returns: list of {
        rbc_transaction_id: str,   # derived from date+description+amount
        posted_date: str,          # ISO YYYY-MM-DD
        description_raw: str,
        amount_str: str,
    }
    Raises SyncFailed if the schema does not match EXPECTED_HEADERS.
    """
    if not path.exists():
        raise SyncFailed(f"CSV not found: {path}")

    rows = []
    with open(path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        headers = set(reader.fieldnames or [])
        missing = EXPECTED_HEADERS - headers
        if missing:
            raise SyncFailed(
                f"RBC CSV schema changed — missing columns: {sorted(missing)}"
            )
        for r in reader:
            desc = (r.get("Description 1") or "").strip()
            if r.get("Description 2"):
                desc += " " + r["Description 2"].strip()
            date_raw = (r.get("Transaction Date") or "").strip()
            amount = (r.get("CAD$") or "").strip()
            if not date_raw or not amount:
                continue
            rbc_id = f"{date_raw}|{desc}|{amount}"
            rows.append({
                "rbc_transaction_id": rbc_id,
                "posted_date": _normalize_date(date_raw),
                "description_raw": desc,
                "amount_str": amount,
            })
    return rows


def _normalize_date(raw: str) -> str:
    """RBC exports dates as MM/DD/YYYY or DD/MM/YYYY — confirm against real export.

    Default assumption: MM/DD/YYYY (RBC's default). Adjust if samples show otherwise.
    """
    from datetime import datetime
    try:
        return datetime.strptime(raw, "%m/%d/%Y").date().isoformat()
    except ValueError:
        # fall through to ISO if already ISO
        return raw
```

---

# Step 9 — Django-Q2 Jobs

## 9.1 `infrastructure/jobs/__init__.py`

```python
```

## 9.2 `sync_job.py`

```python
from datetime import date, timedelta

from django_q.tasks import async_task

from budget.budget.application.container import container


def run_scheduled_sync():
    """Daily 6am — sync last 7 days as a safety overlap."""
    from budget.budget.application.dtos import SyncTransactionsDto
    dto = SyncTransactionsDto(sync_since=date.today() - timedelta(days=7))
    usecase = container()["sync"]()
    usecase.execute(dto)


def run_sync_now(sync_since: date | None = None):
    """Triggered by HTMX 'sync now' button — fire-and-forget."""
    if sync_since is None:
        sync_since = date.today() - timedelta(days=30)
    async_task("budget.budget.infrastructure.jobs.sync_job._run_sync_task", sync_since)


def _run_sync_task(sync_since: date):
    from budget.budget.application.dtos import SyncTransactionsDto
    dto = SyncTransactionsDto(sync_since=sync_since)
    usecase = container()["sync"]()
    usecase.execute(dto)
```

## 9.3 `schedule.py`

```python
from django_q.models import Schedule


def register_schedules(ScheduleModel):
    """Idempotent — only creates the daily sync if it doesn't exist."""
    name = "rbc-daily-sync"
    if ScheduleModel.objects.filter(name=name).exists():
        return
    ScheduleModel.objects.create(
        name=name,
        func="budget.budget.infrastructure.jobs.sync_job.run_scheduled_sync",
        schedule_type=ScheduleModel.CRON,
        cron="0 6 * * *",
    )
```

---

# Step 10 — Interface: Presenters + ViewModels

`budget/budget/interfaces/`. These import domain entities only — no services, no repos.

## 10.1 `__init__.py`

```python
```

## 10.2 `view_models.py`

```python
from dataclasses import dataclass
from typing import Optional


@dataclass
class CategoryTotalVM:
    name: str
    amount: str
    percentage: str
    badge_color: str


@dataclass
class MonthlySummaryVM:
    month_label: str
    total_income: str
    total_expense: str
    net: str
    categories: list[CategoryTotalVM]


@dataclass
class CategoryOptionVM:
    id: int
    name: str


@dataclass
class ReviewQueueItemVM:
    transaction_id: int
    description: str
    amount: str
    date: str
    category_options: list[CategoryOptionVM]


@dataclass
class ReviewQueueVM:
    items: list[ReviewQueueItemVM]
    empty: bool


@dataclass
class SyncResultVM:
    new_count: int
    skipped_count: int
    errors: list
    message: str
```

## 10.3 `presenters.py`

```python
from decimal import Decimal

from budget.budget.domain.entities import MonthlySummary, Transaction
from budget.budget.interfaces.view_models import (
    CategoryOptionVM, CategoryTotalVM, MonthlySummaryVM, ReviewQueueItemVM,
    ReviewQueueVM, SyncResultVM,
)


def _money(amount: Decimal) -> str:
    sign = "-" if amount < 0 else ""
    return f"{sign}${abs(amount):,.2f}"


class DashboardPresenter:
    def present(self, summary: MonthlySummary) -> MonthlySummaryVM:
        from calendar import month_name
        label = f"{month_name[summary.month]} {summary.year}"
        net = summary.total_income.amount + summary.total_expense.amount
        cats = [
            CategoryTotalVM(
                name=c.category.name,
                amount=_money(c.amount.amount),
                percentage=f"{c.percentage:.1f}%",
                badge_color=c.category.color,
            )
            for c in summary.categories
            if c.amount.amount != 0
        ]
        return MonthlySummaryVM(
            month_label=label,
            total_income=_money(summary.total_income.amount),
            total_expense=_money(summary.total_expense.amount),
            net=_money(net),
            categories=cats,
        )


class ReviewQueuePresenter:
    def present(self, pending: list[Transaction], categories) -> ReviewQueueVM:
        opts = [CategoryOptionVM(id=c.id, name=c.name) for c in categories]
        items = [
            ReviewQueueItemVM(
                transaction_id=t.id,
                description=t.description_raw,
                amount=_money(t.amount.amount),
                date=t.posted_date.isoformat(),
                category_options=opts,
            )
            for t in pending
        ]
        return ReviewQueueVM(items=items, empty=len(items) == 0)


class SyncResultPresenter:
    def present(self, result) -> SyncResultVM:
        msg = f"Imported {result.new_count} new, skipped {result.skipped_count}."
        if result.errors:
            msg += f" {len(result.errors)} errors."
        return SyncResultVM(
            new_count=result.new_count,
            skipped_count=result.skipped_count,
            errors=result.errors,
            message=msg,
        )
```

---

# Step 11 — Interface: django-components

## 11.1 `components/__init__.py`

```python
```

## 11.2 `components/summary_card.py`

```python
from django_components import Component


class SummaryCardComponent(Component):
    template_name = "summary_card.html"
```

## 11.3 `components/review_row.py`

```python
from django_components import Component


class ReviewRowComponent(Component):
    template_name = "review_row.html"
```

## 11.4 `components/sync_button.py`

```python
from django_components import Component


class SyncButtonComponent(Component):
    template_name = "sync_button.html"
```

## 11.5 Templates

`components/templates/summary_card.html`:
```html
{% load django_components %}
<section class="card bg-base-100 shadow">
  <div class="card-body">
    <h2 class="card-title">{{ vm.month_label }}</h2>
    <div class="stats stats-vertical lg:stats-horizontal shadow">
      <div class="stat">
        <div class="stat-title">Income</div>
        <div class="stat-value">{{ vm.total_income }}</div>
      </div>
      <div class="stat">
        <div class="stat-title">Expense</div>
        <div class="stat-value text-error">{{ vm.total_expense }}</div>
      </div>
      <div class="stat">
        <div class="stat-title">Net</div>
        <div class="stat-value">{{ vm.net }}</div>
      </div>
    </div>
    <div class="mt-4 space-y-2">
      {% for c in vm.categories %}
      <div class="flex justify-between items-center">
        <span class="badge" style="background:{{ c.badge_color }}">{{ c.name }}</span>
        <span>{{ c.amount }} <small>{{ c.percentage }}</small></span>
      </div>
      {% endfor %}
    </div>
  </div>
</section>
```

`components/templates/review_row.html`:
```html
{% load django_components %}
<tr>
  <td>{{ vm.date }}</td>
  <td>{{ vm.description }}</td>
  <td class="font-mono">{{ vm.amount }}</td>
  <td>
    <form hx-post="/review/{{ vm.transaction_id }}/approve/"
          hx-target="closest tr"
          hx-swap="outerHTML"
          class="flex gap-2">
      {% csrf_token %}
      <select name="category" class="select select-bordered select-sm">
        {% for opt in vm.category_options %}
        <option value="{{ opt.id }}">{{ opt.name }}</option>
        {% endfor %}
      </select>
      <button class="btn btn-sm btn-primary" type="submit">Approve</button>
    </form>
  </td>
</tr>
```

`components/templates/sync_button.html`:
```html
{% load django_components %}
<button hx-post="/sync/" hx-target="#sync-toast" hx-swap="innerHTML"
        class="btn btn-primary">
  Sync now
</button>
<div id="sync-toast" class="text-sm"></div>
```

## 11.6 Register components

In `budget/budget/apps.py` `ready()`, add:
```python
from django_components import component
from budget.budget.interfaces.components.summary_card import SummaryCardComponent
from budget.budget.interfaces.components.review_row import ReviewRowComponent
from budget.budget.interfaces.components.sync_button import SyncButtonComponent
component.register("summary_card", SummaryCardComponent)
component.register("review_row", ReviewRowComponent)
component.register("sync_button", SyncButtonComponent)
```

---

# Step 12 — Interface: Views + URLs

## 12.1 `interfaces/views/__init__.py`

```python
```

## 12.2 `views/dashboard.py`

```python
from datetime import date
from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from budget.budget.application.container import container
from budget.budget.application.dtos import GetMonthlySummaryDto
from budget.budget.interfaces.presenters import DashboardPresenter


@login_required
def dashboard(request):
    today = date.today()
    usecase = container()["monthly_summary"]()
    summary = usecase.execute(GetMonthlySummaryDto(year=today.year, month=today.month))
    vm = DashboardPresenter().present(summary)
    return render(request, "dashboard.html", {"vm": vm, "today": today})
```

## 12.3 `views/sync.py`

```python
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse

from budget.budget.infrastructure.jobs.sync_job import run_sync_now


@login_required
def sync_now(request):
    if request.method != "POST":
        return HttpResponse(status=405)
    run_sync_now()
    return HttpResponse(
        '<div class="alert alert-info">Syncing in the background — refresh in a minute.</div>'
    )
```

## 12.4 `views/review.py`

```python
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.template.loader import render_to_string

from budget.budget.application.container import container
from budget.budget.application.dtos import GetReviewQueueDto
from budget.budget.interfaces.presenters import ReviewQueuePresenter


@login_required
def review_queue(request):
    usecase = container()["review_queue"]()
    pending, categories = usecase.execute(GetReviewQueueDto())
    vm = ReviewQueuePresenter().present(pending, categories)
    html = render_to_string("review_queue.html", {"vm": vm})
    return HttpResponse(html)
```

## 12.5 `views/approve.py`

```python
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.views.decorators.http import require_POST

from budget.budget.application.container import container
from budget.budget.application.dtos import ApproveCategorizationDto
from budget.budget.interfaces.presenters import ReviewQueuePresenter


@require_POST
@login_required
def approve(request, tx_id: int):
    category_id = int(request.POST.get("category"))
    usecase = container()["approve"]()
    usecase.execute(ApproveCategorizationDto(transaction_id=tx_id, category_id=category_id))
    # Re-render an empty row on success (HTMX swap removes the row)
    return HttpResponse('<tr></tr>')
```

## 12.6 Page templates

`budget/budget/templates/dashboard.html`:
```html
{% load django_components static %}
<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Budget</title>
  <link href="https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.min.css" rel="stylesheet">
  <script src="https://unpkg.com/htmx.org@2"></script>
  <script defer src="https://unpkg.com/alpinejs@3"></script>
</head>
<body class="bg-base-200 min-h-screen">
<div class="navbar bg-base-100 shadow">
  <div class="flex-1 px-4 font-bold">RBC Household Budget</div>
  <div class="flex-none">
    <form method="post" action="{% url 'logout' %}">
      {% csrf_token %}
      <button class="btn btn-ghost btn-sm">Sign out</button>
    </form>
  </div>
</div>
<main class="container mx-auto p-4 space-y-6">
  <div>
    {% component "sync_button" %}
  </div>
  {% component "summary_card" vm=vm %}
  <div id="review-queue" hx-get="/review/" hx-trigger="load">
    <span class="loading loading-spinner"></span>
  </div>
</main>
</body>
</html>
```

`budget/budget/templates/review_queue.html`:
```html
{% load django_components %}
<div class="card bg-base-100 shadow">
  <div class="card-body">
    <h2 class="card-title">Review queue</h2>
    {% if vm.empty %}
    <p class="text-sm text-gray-500">Nothing to review — everything's categorized.</p>
    {% else %}
    <table class="table">
      <thead>
        <tr><th>Date</th><th>Description</th><th>Amount</th><th>Category</th></tr>
      </thead>
      <tbody>
        {% for item in vm.items %}
        {% component "review_row" vm=item %}
        {% endfor %}
      </tbody>
    </table>
    {% endif %}
  </div>
</div>
```

## 12.7 `budget/budget/urls.py`

```python
from django.contrib import admin
from django.contrib.auth.views import LoginView, LogoutView
from django.urls import path

from budget.budget.interfaces.views import dashboard, sync, review, approve

urlpatterns = [
    path("admin/", admin.site.urls),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("", dashboard, name="dashboard"),
    path("sync/", sync.sync_now, name="sync_now"),
    path("review/", review.review_queue, name="review_queue"),
    path("review/<int:tx_id>/approve/", approve.approve, name="approve"),
]
```

## 12.8 Login template

`budget/budget/templates/registration/login.html`:
```html
<!doctype html>
<html lang="en" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Sign in</title>
  <link href="https://cdn.jsdelivr.net/npm/daisyui@4/dist/full.min.css" rel="stylesheet">
</head>
<body class="bg-base-200 min-h-screen flex items-center justify-center">
<form method="post" class="card w-96 bg-base-100 shadow-xl p-6 space-y-4">
  {% csrf_token %}
  <h1 class="text-xl font-bold">RBC Household Budget</h1>
  {{ form.as_p }}
  <button class="btn btn-primary w-full" type="submit">Sign in</button>
</form>
</body>
</html>
```

---

# Step 13 — Auth Wiring

Auth is Django built-in. Create two users (you + spouse) via:

```bash
uv run python manage.py createsuperuser  # repeat for spouse
```

All views already use `@login_required`. `LOGIN_URL = "/login/"` is set in `base.py`.

No signup flow. No password reset flow for v1 — out of scope.

---

# Step 14 — docker-compose

## 14.1 `docker-compose.yml`

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: budget
      POSTGRES_USER: budget
      POSTGRES_PASSWORD: budget_dev
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./compose/db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports: ["5432:5432"]

  web:
    build: { context: ., dockerfile: Dockerfile }
    command: python manage.py runserver 0.0.0.0:8000
    volumes: ["./:/app"]
    env_file: .env
    depends_on: [db]
    ports: ["8000:8000"]

  qcluster:
    build: { context: ., dockerfile: Dockerfile }
    command: python manage.py qcluster
    env_file: .env
    depends_on: [db, web]

volumes:
  pgdata:
```

## 14.2 `compose/db/init.sql`

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

## 14.3 `Dockerfile` (shared by web + qcluster)

```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install uv
RUN pip install --upgrade uv

COPY pyproject.toml ./
RUN uv sync

# Playwright + chromium deps (ARM64-ok on >=1.40)
RUN uv run playwright install --with-deps chromium

COPY . .

EXPOSE 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
```

## 14.4 `.dockerignore`

```
.git
.venv
__pycache__
*.pyc
postgres-data
.playwright
test-results
*.log
.env
```

## 14.5 First run

```bash
cp .env.example .env          # then fill SECRET_KEY
docker compose up -d db
docker compose run --rm web python manage.py migrate
docker compose run --rm web python manage.py createsuperuser
docker compose up -d
```

Visit `http://localhost:8000/`, sign in.

---

# Step 15 — Tests

## 15.1 `tests/conftest.py`

```python
import pytest
from django.contrib.auth.models import User

from budget.budget.application.container import build_container


@pytest.fixture
def container(db):
    return build_container()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="danny", password="test")


@pytest.fixture
def client_logged(client, user):
    client.force_login(user)
    return client
```

## 15.2 Unit tests (no DB)

`tests/unit/test_title_normalizer.py`:
```python
from budget.budget.application.matching.normalizer import normalize


def test_identity_lowercases():
    assert normalize("TIM HORTONS #4521").value == "tim hortons #4521"


def test_empty():
    assert normalize("").value == ""
```

`tests/unit/test_exact_matcher.py`:
```python
from budget.budget.application.matching.exact_matcher import match
from budget.budget.domain.entities import Category, CategoryRule
from budget.budget.domain.value_objects import NormalizedTitle


def test_hit():
    cat = Category(id=1, name="Coffee")
    rule = CategoryRule(id=10, match_key="tim hortons", category_id=1)
    out = match(
        NormalizedTitle("tim hortons"),
        rules={"tim hortons": rule},
        categories={1: cat},
    )
    assert out is not None
    assert out[1].name == "Coffee"


def test_miss():
    assert match(NormalizedTitle("nope"), rules={}, categories={}) is None
```

`tests/unit/test_presenters.py`:
```python
from decimal import Decimal

from budget.budget.domain.entities import Category, CategoryTotal, MonthlySummary
from budget.budget.domain.value_objects import Money
from budget.budget.interfaces.presenters import DashboardPresenter


def test_dashboard_presenter_formats_money():
    s = MonthlySummary(
        year=2026, month=7,
        total_income=Money(Decimal("1000")),
        total_expense=Money(Decimal("-600")),
        categories=[],
    )
    vm = DashboardPresenter().present(s)
    assert vm.total_income == "$1,000.00"
    assert vm.total_expense == "$600.00"
    assert vm.net == "$400.00"
```

## 15.3 Integration tests (DB)

`tests/integration/test_sync_usecase.py`:
```python
from datetime import date
from unittest.mock import MagicMock

from budget.budget.application.dtos import SyncTransactionsDto
from budget.budget.application.use_cases import SyncTransactionsUseCase


def test_sync_dedupes_existing(db, container):
    scraper = MagicMock()
    scraper.scrape.return_value = [{
        "rbc_transaction_id": "X|desc|10.00",
        "posted_date": "2026-07-01",
        "description_raw": "desc",
        "amount_str": "10.00",
    }]
    usecase = SyncTransactionsUseCase(
        scraper,
        container["sync"]()._repo if hasattr(container["sync"](), "_repo") else None,
        MagicMock(),
    )
    # ... drive through, assert new_count=1 then second call skipped_count=1
```

(Flesh out the rest of the integration tests mirroring the structure: each use case gets one test file, one test per public method, using `db` fixture + `container` fixture + factory-boy for `TransactionModel`.)

## 15.4 Functional tests (HTTP)

`tests/functional/test_dashboard.py`:
```python
def test_dashboard_requires_login(client):
    resp = client.get("/")
    assert resp.status_code == 302
    assert "/login/" in resp.url


def test_dashboard_logged_in(client_logged):
    resp = client_logged.get("/")
    assert resp.status_code == 200
```

## 15.5 RBC scraper test (mocked Playwright)

`tests/integration/test_rbc_scraper.py`:
```python
from unittest.mock import patch
from datetime import date

from budget.budget.infrastructure.rbc.scraper import PlaywrightRBCScraper


def test_scraper_raises_when_no_creds(monkeypatch):
    monkeypatch.delenv("RBC_USERNAME", raising=False)
    monkeypatch.delenv("RBC_PASSWORD", raising=False)
    s = PlaywrightRBCScraper()
    try:
        s.scrape(date.today())
        assert False, "should raise"
    except Exception:
        pass
```

## 15.6 Run all

```bash
uv run pytest -q
```

---

# Step 16 — Final Verification

Run each command in order. Stop and fix on any failure before moving on.

```bash
# 1. Lint
uv run ruff check budget tests

# 2. Type errors (no mypy config yet — at least ruff)
uv run ruff check budget tests --select E,F,UP

# 3. Django system check
uv run python manage.py check

# 4. Migrations dry-run
uv run python manage.py makemigrations --check --dry-run

# 5. Tests
uv run pytest -q

# 6. Run dev server
uv run python manage.py runserver
# visit http://localhost:8000/ — should redirect to /login/
# sign in with superuser, see empty dashboard + empty review queue
```

---

## After the Build — First Real Action

Per the handoff, the matcher cannot be trusted until samples are in. Once the app boots:

1. Log into RBC manually, export the last 60 days of joint chequing transactions as CSV.
2. Drop the file at `samples/rbc_export_real.csv`.
3. Copy 30–50 description strings into `samples/rbc_descriptions.txt` (one per line).
4. Inspect the patterns (store numbers, ref codes, dates embedded in description).
5. Update `budget/budget/application/matching/normalizer.py` `normalize()` to apply the validated pipeline — swap `normalize_strict` into `normalize`.
6. Re-run `tests/unit/test_title_normalizer.py` with cases derived from the samples.

---

## Reference: Use-case → file map

| Use case | File | View route |
|---|---|---|
| `SyncTransactionsUseCase` | `application/use_cases.py` | `POST /sync/` (via job) |
| `AutoCategorizeUseCase` | `application/use_cases.py` | (called by sync) |
| `ApproveCategorizationUseCase` | `application/use_cases.py` | `POST /review/<id>/approve/` |
| `GetMonthlySummaryUseCase` | `application/use_cases.py` | `GET /` |
| `GetReviewQueueUseCase` | `application/use_cases.py` | `GET /review/` |

## Reference: Dependency direction cheat sheet

| Layer | May import |
|---|---|
| `domain/` | stdlib only |
| `application/` | `domain/`, stdlib |
| `services/` | `application/`, `domain/`, stdlib |
| `infrastructure/` | `application/`, `domain/`, Django, Playwright |
| `interfaces/views/` | `application/container`, `interfaces/presenters`, Django |
| `interfaces/presenters/` | `domain/`, `interfaces/view_models` |
| `interfaces/components/` | django-components, templates |
| `tests/` | everything |

---

## Done

The build is complete when:

- `uv run pytest -q` is green
- `docker compose up` starts db + web + qcluster cleanly
- `http://localhost:8000/` redirects to login, then shows dashboard after auth
- The HTMX "Sync now" button enqueues a Django-Q2 task (visible in `django_q.orm` table)
- The review queue fragment loads at `GET /review/`
- Approving a row removes it from the queue and creates / reinforces a `CategoryRule`

Hand off to the human for: real RBC sample collection → final normalizer tightening.
