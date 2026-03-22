---
title: "Dependency Management with Poetry and uv"
description: "Use Poetry and uv for reproducible dependency management with lock files."
duration_minutes: 25
order: 3
---

## The Problem with pip freeze

`pip freeze` captures the exact versions of every package in your environment, but it has significant problems:

1. **It includes transitive dependencies.** Your `requirements.txt` will list dozens of packages you didn't choose — packages your dependencies depend on. When a dependency upgrades one of its transitive deps, your `requirements.txt` changes in ways you didn't intend.

2. **No distinction between direct and transitive deps.** Looking at a `pip freeze` output, you cannot tell which packages you actually depend on vs. which were pulled in automatically.

3. **No dependency graph.** If you want to remove a package, you have no way to know if it is safe to also remove its transitive dependencies.

4. **No constraint-based updates.** You can't say "update everything within these constraints" — it's all-or-nothing.

The solution is a **dependency resolver with a lock file** — a tool that separates your stated constraints from the resolved, pinned state.

---

## Poetry: Full-Featured Dependency Manager

Poetry handles dependency management, virtual environments, building, and publishing in a single integrated tool. It uses `pyproject.toml` as its configuration file with its own `[tool.poetry]` tables.

### Installation

```bash
# Official installer (recommended — installs Poetry in its own isolated environment)
curl -sSL https://install.python-poetry.org | python3 -

# Verify installation
poetry --version  # Poetry (version 1.8.x)
```

### Creating a New Project

```bash
# Scaffold a complete project structure
poetry new myproject

# Creates:
# myproject/
# ├── pyproject.toml
# ├── README.md
# ├── myproject/
# │   └── __init__.py
# └── tests/
#     └── __init__.py
```

```toml
# The generated pyproject.toml
[tool.poetry]
name = "myproject"
version = "0.1.0"
description = ""
authors = ["Your Name <you@example.com>"]
readme = "README.md"

[tool.poetry.dependencies]
python = "^3.11"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

### Adding Poetry to an Existing Project

```bash
cd existing-project
poetry init   # Interactive wizard — asks for name, version, deps, etc.
```

### Managing Dependencies

```bash
# Add a runtime dependency
poetry add requests
# Updates pyproject.toml AND resolves + updates poetry.lock

# Add with version constraint
poetry add "fastapi>=0.110,<1.0"
poetry add "pydantic^2.0"   # ^ means compatible: >=2.0,<3.0

# Add a development dependency
poetry add --group dev pytest ruff mypy black
poetry add --group dev "pytest-asyncio>=0.23"

# Add an optional dependency group
poetry add --group docs mkdocs mkdocs-material

# Remove a dependency
poetry remove requests
```

After `poetry add requests`, your `pyproject.toml` looks like:

```toml
[tool.poetry.dependencies]
python = "^3.11"
requests = "^2.31.0"
fastapi = ">=0.110,<1.0"
pydantic = "^2.0"

[tool.poetry.group.dev.dependencies]
pytest = "^8.1"
ruff = "^0.4"
mypy = "^1.9"
black = "^24.0"
```

### The poetry.lock File

`poetry.lock` is automatically created and updated by Poetry. It contains the exact resolved versions of every package in the entire dependency tree.

```
# poetry.lock (excerpt)
[[package]]
name = "requests"
version = "2.31.0"
description = "Python HTTP for Humans."
...
dependencies = {certifi = ">=2017.4.17", charset-normalizer = ">=2,<4", ...}
...
```

**Always commit `poetry.lock` to version control.** It is the reproducible snapshot that ensures every team member and CI server installs identical packages.

```bash
# Install exactly what's in the lock file (no resolving — fast and reproducible)
poetry install

# Install without dev dependencies (for production)
poetry install --only main

# Install a specific group
poetry install --with docs

# Update all packages within constraints (regenerates lock file)
poetry update

# Update a specific package
poetry update requests

# Show the dependency tree
poetry show --tree
```

### Running Commands and the Shell

```bash
# Run a command inside the project's virtual environment (without activating)
poetry run python my_script.py
poetry run pytest
poetry run python -m mypackage.cli

# Activate the virtual environment in your current shell
poetry shell
# Now python, pip, pytest etc. all use the project env
exit  # Deactivate

# Show where the venv is
poetry env info
```

### Building and Publishing

```bash
# Build the package (creates dist/*.whl and dist/*.tar.gz)
poetry build

# Publish to PyPI (prompts for credentials)
poetry publish

# Build and publish in one step
poetry publish --build

# Publish to a private registry
poetry publish --repository my-registry
```

### Poetry Configuration

```bash
# Create virtual envs inside the project directory (many people prefer this)
poetry config virtualenvs.in-project true

# Show config
poetry config --list
```

With `virtualenvs.in-project = true`, Poetry creates `.venv/` inside your project — the same convention as plain `venv`.

---

## uv: The Fast Alternative

`uv` is a new Python package and project manager written in Rust, developed by Astral (the team behind `ruff`). It is designed as a drop-in replacement for `pip`, `pip-tools`, `virtualenv`, and `pipx` — with speed as the primary goal.

**10–100x faster than pip** — cold installs that take 30 seconds with pip take under 1 second with uv.

### Installation

```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Or with pip
pip install uv

# Or with pipx
pipx install uv

# Verify
uv --version  # uv 0.x.x
```

### uv as a pip Replacement

For the simplest use case, `uv pip` is a drop-in replacement for `pip`:

```bash
# Create a virtual environment
uv venv            # Creates .venv/ in current directory
uv venv --python 3.11  # Use a specific Python version

# Activate (same as before — uv doesn't change this)
source .venv/bin/activate

# Install packages (same interface as pip, but much faster)
uv pip install requests fastapi
uv pip install -r requirements.txt
uv pip install -e .

# Uninstall, list, show
uv pip uninstall requests
uv pip list
uv pip show requests
```

### uv pip compile: Generating Lock Files

Like `pip-compile` from pip-tools, `uv pip compile` resolves a set of constraints and produces an exact pinned `requirements.txt`:

```bash
# requirements.in — your direct deps
# fastapi>=0.110
# sqlalchemy>=2.0
# pydantic>=2.0

# Resolve and pin all transitive deps
uv pip compile requirements.in -o requirements.txt

# Compile for a specific Python version
uv pip compile requirements.in --python-version 3.11 -o requirements.txt
```

### uv pip sync: Reproducible Installs

```bash
# Install exactly what's in requirements.txt, removing anything else
# This is stronger than pip install -r: it also REMOVES packages not listed
uv pip sync requirements.txt
```

### uv as a Project Manager (uv >= 0.2)

Recent versions of `uv` include full project management features:

```bash
# Initialize a new project
uv init myproject
cd myproject

# Add dependencies (updates pyproject.toml and uv.lock)
uv add requests fastapi
uv add --dev pytest ruff

# Remove a dependency
uv remove requests

# Install project (reads uv.lock if present, pyproject.toml otherwise)
uv sync

# Run a command in the project env
uv run python my_script.py
uv run pytest

# Update dependencies within constraints
uv lock --upgrade
uv lock --upgrade-package requests
```

### uv run: Scripts with Inline Dependencies

`uv run` can execute a script with inline dependency declarations — no project setup needed:

```bash
# Run a script, automatically installing its deps
uv run --with requests,rich my_script.py

# PEP 723: embed dependencies in the script itself
# /// script
# dependencies = ["requests", "rich"]
# ///
uv run my_script.py  # uv reads the inline metadata and installs deps
```

### uv tool: Global CLI Tool Installation

```bash
# Install a CLI tool globally (like pipx)
uv tool install black
uv tool install ruff
uv tool install mypy

# Run a tool without permanently installing it
uv tool run black myfile.py
uvx black myfile.py    # shorthand for uv tool run

# List installed tools
uv tool list

# Upgrade a tool
uv tool upgrade black
```

---

## Comparison: pip vs pip-tools vs Poetry vs uv

| Feature | pip | pip-tools | Poetry | uv |
|---|---|---|---|---|
| Install packages | Yes | Yes | Yes | Yes |
| Lock file | No | requirements.txt | poetry.lock | uv.lock |
| Separate direct/transitive | No | Yes (with .in files) | Yes | Yes |
| Dependency resolution | Basic | Yes | Yes (SAT solver) | Yes (fast) |
| Virtual env management | No | No | Yes | Yes |
| Build and publish | No | No | Yes | Partial |
| Speed | Baseline | ~pip | ~pip | 10–100x faster |
| Written in | Python | Python | Python | Rust |
| Project scaffolding | No | No | Yes | Yes |
| Global tool install | No | No | No | Yes (like pipx) |

**When to use what:**
- **pip + pip-tools**: simple projects, scripting, when you want minimal tooling
- **Poetry**: full-featured projects that will be published to PyPI; great developer experience
- **uv**: when speed matters (large teams, CI/CD); modern projects; increasingly feature-complete

---

## The Lock File Philosophy

Both Poetry (`poetry.lock`) and uv (`uv.lock`) follow the same philosophy: separate the constraints you specify from the exact resolution that satisfies them.

```
Developer specifies:      "I need requests >= 2.28"
Lock file records:        "requests 2.31.0, certifi 2024.2.2, ..."
Colleague installs:       Exact same versions — no surprises
```

This is the model used by npm (`package-lock.json`), Cargo (`Cargo.lock`), and Go (`go.sum`). It took Python a while to get here, but the tooling now exists.

**Rule**: always commit the lock file. The only exception is library packages (as opposed to applications) where you want to allow users to use any compatible version.

---

## Key Takeaways

- **`pip freeze` includes everything** — direct and transitive dependencies mixed together. For non-trivial projects, it's difficult to maintain.
- **The solution is a dependency resolver + lock file**: you specify constraints, the tool resolves exact versions, and the lock file ensures reproducibility.
- **Poetry** is a full-featured tool: it manages dependencies, virtual environments, building, and publishing. Use `poetry add` to add deps, commit `poetry.lock`, run `poetry install` to reproduce the environment.
- **Always commit `poetry.lock`** (or `uv.lock`). Never commit it for library packages.
- **`poetry run`** and **`poetry shell`** let you work in the project environment without manual activation.
- **uv** is the new fast alternative. `uv pip install` is a drop-in for `pip install` but 10–100x faster. `uv sync` installs exactly what's in the lock file.
- **`uv tool install`** installs global CLI tools in isolation, like pipx.
- For new projects, either Poetry or uv are excellent choices. Both use `pyproject.toml` and produce lock files. uv is rapidly adding features and its speed is a significant advantage in CI/CD pipelines.
