---
title: "Code Quality: ruff, black, isort & pre-commit"
description: "Automate code formatting, linting, and quality checks in your Python workflow."
duration_minutes: 20
order: 5
---

## Why Automate Code Quality?

Manual code style reviews waste reviewer time, create friction in code review, and lead to endless debates about formatting preferences. Automated tools eliminate all of this:

- **No style debates**: the tool decides, everyone follows
- **Consistent codebase**: every file looks the same regardless of who wrote it
- **Catch real bugs**: linters find undefined variables, unused imports, dangerous patterns
- **Zero effort**: format-on-save in the editor; CI fails if something slips through

The ecosystem for Python quality tooling has consolidated significantly. In 2024, the standard setup is:

- **ruff** — fast linter and formatter (replaces flake8, isort, pyupgrade, and optionally black)
- **black** — the original uncompromising formatter (still widely used)
- **mypy** — static type checking (covered in the previous lesson)
- **pre-commit** — git hooks that run all of the above automatically

## black: The Uncompromising Formatter

Black formats Python code with zero configuration choices. Its goal: make all Python code look the same.

```bash
# Install
pip install black

# Format all files in src/
black src/

# Check without modifying (exit code 1 if changes would be made — for CI)
black --check src/

# Show a diff of what would change
black --diff src/
```

Black's style choices:
- Line length: **88 characters** (adjustable but rarely changed)
- Trailing commas in multi-line structures (allows cleaner diffs)
- Double quotes (converts single to double)
- Consistent parentheses and line wrapping

```python
# Before black:
x = {'a':1,'b':2,'c':3}
def func(arg1,arg2,
arg3):
    return arg1+arg2+arg3

foo(very_long_variable_name_one, very_long_variable_name_two, very_long_variable_name_three)

# After black:
x = {"a": 1, "b": 2, "c": 3}


def func(
    arg1,
    arg2,
    arg3,
):
    return arg1 + arg2 + arg3


foo(
    very_long_variable_name_one,
    very_long_variable_name_two,
    very_long_variable_name_three,
)
```

Configure in `pyproject.toml`:

```toml
[tool.black]
line-length = 88
target-version = ["py311"]
include = '\.pyi?$'
extend-exclude = '''
/(
  | migrations
  | vendor
)/
'''
```

## isort: Sorting Imports

isort organizes imports into three groups, separated by blank lines:

1. Standard library (`os`, `sys`, `datetime`, ...)
2. Third-party packages (`fastapi`, `sqlalchemy`, `requests`, ...)
3. Local application imports (`from myapp.models import User`)

```bash
pip install isort

# Sort imports in all files
isort src/

# Use the black-compatible profile (prevents conflicts)
isort --profile black src/

# Check without modifying
isort --check src/
```

```python
# Before isort:
from myapp.models import User
import os
from fastapi import FastAPI
import sys
from myapp.database import get_db
from datetime import datetime
import requests

# After isort (with --profile black):
import os
import sys
from datetime import datetime

import requests
from fastapi import FastAPI

from myapp.database import get_db
from myapp.models import User
```

Configure in `pyproject.toml`:

```toml
[tool.isort]
profile = "black"
line_length = 88
known_third_party = ["fastapi", "sqlalchemy", "pydantic"]
known_first_party = ["myapp"]
```

## ruff: The Modern All-in-One

**ruff** is a linter and formatter written in Rust, 10-100x faster than the Python equivalents it replaces. A single tool can replace flake8, pyflakes, pycodestyle, isort, pyupgrade, pep8-naming, flake8-bugbear, and more.

```bash
pip install ruff

# Run linting checks
ruff check src/

# Auto-fix safe issues (unused imports, simple style fixes)
ruff check --fix src/

# Format code (black-compatible)
ruff format src/

# Check formatting without modifying
ruff format --check src/
```

### Key Rule Sets

ruff uses codes from various tools:

| Prefix | Source | Examples |
|---|---|---|
| `E`, `W` | pycodestyle | `E501` line too long, `W291` trailing whitespace |
| `F` | pyflakes | `F401` unused import, `F821` undefined name |
| `I` | isort | `I001` import order |
| `N` | pep8-naming | `N801` class names should be CapWords |
| `UP` | pyupgrade | `UP006` use `list` instead of `typing.List` |
| `B` | flake8-bugbear | `B006` mutable default argument, `B023` loop variable captured |
| `C4` | flake8-comprehensions | `C401` unnecessary list comprehension |
| `SIM` | flake8-simplify | `SIM118` use `in dict` not `in dict.keys()` |

```python
# ruff catches real bugs:

# B006: mutable default argument — common Python gotcha
def append_item(item, lst=[]):  # B006: Do not use mutable data structures as default arguments
    lst.append(item)
    return lst

# F401: unused import
import os  # F401: `os` imported but unused

# UP006: use modern type annotation
from typing import List  # UP006: use `list` instead of `List`
def process(items: List[str]) -> None: ...

# B023: loop variable in lambda/function closure
callbacks = []
for i in range(5):
    callbacks.append(lambda: print(i))  # B023: Function definition does not bind loop variable
```

### ruff Configuration in pyproject.toml

```toml
[tool.ruff]
line-length = 88
target-version = "py311"
exclude = [
    ".git",
    ".venv",
    "__pycache__",
    "migrations",
    "vendor",
]

[tool.ruff.lint]
select = [
    "E",   # pycodestyle errors
    "W",   # pycodestyle warnings
    "F",   # pyflakes
    "I",   # isort
    "N",   # pep8-naming
    "UP",  # pyupgrade
    "B",   # flake8-bugbear
    "C4",  # flake8-comprehensions
    "SIM", # flake8-simplify
]
ignore = [
    "E501",   # Line too long — handled by formatter
    "B008",   # Do not perform function calls in default arguments (common in FastAPI)
]

[tool.ruff.lint.isort]
known-first-party = ["myapp"]

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = ["S101"]  # Allow assert in tests
"migrations/*.py" = ["E501", "F401"]  # Looser rules in migrations
```

### ruff vs black

If you're starting a new project, you can use **ruff format** instead of **black** — it produces nearly identical output, is much faster, and removes one tool from your setup. For existing projects already using black, keeping black is fine.

## pre-commit: Git Hooks Made Easy

pre-commit installs git hooks that automatically run your quality checks before each commit. If any check fails, the commit is blocked.

```bash
# Install
pip install pre-commit

# Install the git hooks into your repository
pre-commit install

# Run all hooks manually on all files (useful first run after config change)
pre-commit run --all-files
```

The configuration lives in `.pre-commit-config.yaml`:

```yaml
# .pre-commit-config.yaml
repos:
  # ruff: linting and formatting (replaces flake8 + isort + black)
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.3.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  # mypy: type checking
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.8.0
    hooks:
      - id: mypy
        additional_dependencies: [types-requests, types-PyYAML]

  # Standard pre-commit hooks
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-toml
      - id: check-merge-conflict
      - id: debug-statements    # Catches leftover print() / pdb.set_trace()
      - id: detect-private-key  # Prevents committing secrets
```

When you run `git commit`, pre-commit runs all hooks. If ruff finds and fixes issues, it modifies the files but still **blocks the commit** — you must `git add` the fixed files and commit again. This ensures you review the changes before committing.

```bash
# Example workflow
git add src/mymodule.py
git commit -m "Add feature"
# pre-commit runs...
# ruff fixed 2 files (trailing whitespace, import order)
# pre-commit exit code: 1 (blocked)

# Review the auto-fixes
git diff
git add -u  # Stage the auto-fixed files
git commit -m "Add feature"  # Now it passes
```

### Updating Hook Versions

```bash
# Update all hooks to their latest tagged versions
pre-commit autoupdate
```

### Running in CI

Add to your CI pipeline (e.g., GitHub Actions):

```yaml
# .github/workflows/quality.yml
name: Code Quality

on: [push, pull_request]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.11"
      - run: pip install pre-commit
      - run: pre-commit run --all-files
```

## Complete pyproject.toml Example

```toml
[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.backends.legacy:build"

[project]
name = "myapp"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi==0.110.0",
    "sqlalchemy==2.0.28",
    "uvicorn[standard]==0.29.0",
]

[project.optional-dependencies]
dev = [
    "ruff>=0.3.0",
    "black>=24.0",
    "isort>=5.13",
    "mypy>=1.8",
    "pytest>=8.1",
    "pytest-cov>=4.1",
    "pre-commit>=3.6",
]

# ── ruff ──────────────────────────────────────────────────────────────────────
[tool.ruff]
line-length = 88
target-version = "py311"

[tool.ruff.lint]
select = ["E", "W", "F", "I", "N", "UP", "B", "C4", "SIM"]
ignore = ["E501", "B008"]

[tool.ruff.lint.per-file-ignores]
"tests/**/*.py" = ["S101"]

# ── black ─────────────────────────────────────────────────────────────────────
[tool.black]
line-length = 88
target-version = ["py311"]

# ── isort ─────────────────────────────────────────────────────────────────────
[tool.isort]
profile = "black"
line_length = 88
known_first_party = ["myapp"]

# ── mypy ──────────────────────────────────────────────────────────────────────
[tool.mypy]
python_version = "3.11"
disallow_untyped_defs = true
warn_return_any = true
ignore_missing_imports = true

# ── pytest ────────────────────────────────────────────────────────────────────
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = "-v --cov=src --cov-report=term-missing"

[tool.coverage.report]
fail_under = 80
omit = ["*/tests/*", "*/migrations/*"]
```

## VS Code Integration

Install the Ruff extension for VS Code (`charliermarsh.ruff`) and configure format-on-save:

```json
// .vscode/settings.json
{
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "charliermarsh.ruff",
    "[python]": {
        "editor.defaultFormatter": "charliermarsh.ruff",
        "editor.codeActionsOnSave": {
            "source.fixAll.ruff": "explicit",
            "source.organizeImports.ruff": "explicit"
        }
    },
    "ruff.lint.args": ["--config=pyproject.toml"],
    "mypy-type-checker.args": ["--config-file=pyproject.toml"]
}
```

With this setup, every time you save a file:
1. ruff formats and fixes the code automatically
2. Imports are re-sorted
3. The editor shows type errors inline

## A Minimal Quality Setup for a New Project

If you're starting fresh and want the simplest possible setup:

```bash
# 1. Install tools
pip install ruff pre-commit

# 2. Create pyproject.toml with ruff config (see above)

# 3. Create .pre-commit-config.yaml (see above)

# 4. Install the git hooks
pre-commit install

# 5. Run on all existing files to establish a baseline
pre-commit run --all-files

# 6. Commit the config files
git add pyproject.toml .pre-commit-config.yaml
git commit -m "Add ruff and pre-commit quality tooling"
```

From this point on, every commit is automatically checked. New team members who clone the repo and run `pre-commit install` get the same hooks immediately.

## Key Takeaways

- **black** is the standard Python formatter: opinionated, zero configuration, enforces consistent style across all files. Use `black --check` in CI.
- **isort** sorts imports into stdlib/third-party/local groups. Always use `--profile black` to avoid conflicts with black's formatting.
- **ruff** is a fast, modern replacement for flake8, isort, pyupgrade, and more. `ruff check --fix` auto-fixes safe issues; `ruff format` formats like black.
- Configure all tools in `pyproject.toml` under `[tool.ruff]`, `[tool.black]`, `[tool.isort]`, and `[tool.mypy]` — single file, no scattered config files.
- **pre-commit** installs git hooks that run checks before each commit. Any failure blocks the commit, ensuring code quality is enforced at the source.
- Run `pre-commit run --all-files` once after adding or updating hooks to bring existing code into compliance.
- Add `pre-commit run --all-files` to your CI pipeline as a final safety net.
- For new projects, ruff alone can replace black + isort + flake8, simplifying the toolchain while running significantly faster.
