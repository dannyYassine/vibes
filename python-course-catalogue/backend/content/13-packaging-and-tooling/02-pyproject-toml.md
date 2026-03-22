---
title: "Modern Packaging with pyproject.toml"
description: "Use pyproject.toml as the single source of truth for Python project configuration."
duration_minutes: 25
order: 2
---

## A Brief History of Python Packaging

Python packaging has evolved significantly over the past two decades, and the history helps explain why `pyproject.toml` exists.

**Era 1: `setup.py` (2000s–2015)**
Packages were described by a `setup.py` file — an executable Python script that called `setuptools.setup()`. This was powerful but dangerous: running an unknown `setup.py` could execute arbitrary code. It also couldn't express build-time dependencies.

```python
# setup.py — the old way (do not use for new projects)
from setuptools import setup, find_packages
setup(
    name="mypackage",
    version="1.0.0",
    packages=find_packages(),
    install_requires=["requests>=2.28"],
)
```

**Era 2: `setup.cfg` (2015–2021)**
A declarative alternative emerged. `setup.cfg` is a static INI-style file that can be read without executing Python, but still requires `setup.py` to exist as a shim.

**Era 3: `pyproject.toml` (2021–present)**
PEP 517 (2015), PEP 518 (2016), and PEP 621 (2021) together defined a new standard: a single TOML file that specifies the build system, project metadata, and tool configuration — without executing Python code during introspection.

`pyproject.toml` is now the official recommendation for all new Python projects.

---

## The Structure of pyproject.toml

A `pyproject.toml` file contains several TOML tables:

```toml
# pyproject.toml (overview)

[build-system]       # Which tool builds the package
[project]            # Package metadata (name, version, deps, etc.)
[project.optional-dependencies]  # Optional extras
[project.scripts]    # CLI entry points
[project.urls]       # Links to homepage, docs, source

[tool.setuptools]    # Setuptools-specific config
[tool.pytest.ini_options]  # pytest configuration
[tool.mypy]          # mypy type checker configuration
[tool.ruff]          # ruff linter configuration
[tool.black]         # black formatter configuration
```

---

## [build-system]: Choosing Your Build Backend

The `[build-system]` table tells pip and other tools which backend to use to build your package. This is the only table required by PEP 517.

```toml
# Option 1: setuptools (most common, good compatibility)
[build-system]
requires = ["setuptools>=68", "wheel"]
build-backend = "setuptools.build_meta"

# Option 2: hatchling (modern, clean, recommended by PyPA)
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

# Option 3: flit (minimal, great for pure-Python packages)
[build-system]
requires = ["flit_core>=3.2"]
build-backend = "flit_core.buildapi"

# Option 4: poetry's build backend
[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

For new projects with no special requirements, **hatchling** or **setuptools** are the most commonly used.

---

## [project]: Package Metadata (PEP 621)

The `[project]` table is the heart of `pyproject.toml`. It replaces the arguments to `setup()` in `setup.py`.

```toml
[project]
# Required fields
name = "my-awesome-package"    # The name on PyPI (hyphens are convention)
version = "1.2.3"

# Recommended fields
description = "A short, one-line description of what the package does."
readme = "README.md"           # File to use as the long description on PyPI
license = {text = "MIT"}       # Or: {file = "LICENSE"}
requires-python = ">=3.9"      # Minimum Python version

# Author information
authors = [
    {name = "Jane Smith", email = "jane@example.com"},
    {name = "Bob Jones"},
]
maintainers = [
    {name = "Jane Smith", email = "jane@example.com"},
]

# Runtime dependencies
dependencies = [
    "requests>=2.28",
    "pydantic>=2.0,<3.0",
    "click>=8.0",
    "sqlalchemy>=2.0",
]

# Keywords (for PyPI search)
keywords = ["web", "api", "async", "http"]

# PyPI classifiers: https://pypi.org/classifiers/
classifiers = [
    "Development Status :: 4 - Beta",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.9",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Topic :: Internet :: WWW/HTTP",
    "Topic :: Software Development :: Libraries :: Python Modules",
]
```

---

## [project.optional-dependencies]: Extras

Optional dependency groups allow users to install additional packages for specific use cases (development, testing, documentation, etc.).

```toml
[project.optional-dependencies]
# pip install "mypackage[dev]"
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "pytest-cov>=4.0",
    "ruff>=0.4",
    "mypy>=1.9",
    "black>=24.0",
]

# pip install "mypackage[docs]"
docs = [
    "mkdocs>=1.5",
    "mkdocs-material>=9.0",
    "mkdocstrings[python]>=0.24",
]

# pip install "mypackage[redis]"
redis = [
    "redis>=5.0",
]

# pip install "mypackage[all]"
all = [
    "mypackage[dev]",
    "mypackage[docs]",
    "mypackage[redis]",
]
```

Install extras with brackets:
```bash
pip install "mypackage[dev]"
pip install -e ".[dev]"          # Editable install with dev extras
pip install "mypackage[dev,docs]"  # Multiple extras at once
```

---

## [project.scripts]: CLI Entry Points

Entry points define console scripts — executables installed into the venv's `bin/` directory when the package is installed.

```toml
[project.scripts]
# command-name = "module.path:function_name"
my-tool = "mypackage.cli:main"
my-tool-admin = "mypackage.admin_cli:main"
```

After installation:
```bash
pip install my-awesome-package
my-tool --help   # Runs mypackage.cli.main()
```

Your CLI function should look like:
```python
# mypackage/cli.py
import click

@click.command()
@click.option('--name', default='World')
def main(name):
    click.echo(f'Hello, {name}!')

if __name__ == '__main__':
    main()
```

---

## [project.urls]: Project Links

These links appear on the PyPI project page:

```toml
[project.urls]
Homepage = "https://example.com"
Documentation = "https://mypackage.readthedocs.io"
Repository = "https://github.com/username/mypackage"
"Bug Tracker" = "https://github.com/username/mypackage/issues"
Changelog = "https://github.com/username/mypackage/blob/main/CHANGELOG.md"
```

---

## [tool.*]: Centralizing Tool Configuration

One of the biggest benefits of `pyproject.toml` is that it replaces a dozen separate config files. Instead of `setup.cfg`, `pytest.ini`, `mypy.ini`, `.flake8`, `.isort.cfg`, and `pyproject.toml`, you have one file.

### pytest Configuration

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "-v --cov=mypackage --cov-report=term-missing"
asyncio_mode = "auto"
```

### mypy Configuration

```toml
[tool.mypy]
python_version = "3.11"
strict = true
ignore_missing_imports = true
warn_return_any = true
warn_unused_configs = true

[[tool.mypy.overrides]]
module = "tests.*"
disallow_untyped_defs = false
```

### ruff Configuration

```toml
[tool.ruff]
line-length = 88
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP"]
ignore = ["E501"]  # line too long (handled by formatter)

[tool.ruff.lint.isort]
known-first-party = ["mypackage"]
```

### black Configuration

```toml
[tool.black]
line-length = 88
target-version = ["py311"]
include = '\.pyi?$'
```

---

## Dynamic Fields: Version from Source

Instead of hardcoding the version in `pyproject.toml`, you can read it from your source code or git tags:

```toml
[project]
name = "mypackage"
dynamic = ["version"]  # Tell the build backend to determine this dynamically

[tool.setuptools.dynamic]
version = {attr = "mypackage.__version__"}
```

```python
# mypackage/__init__.py
__version__ = "1.2.3"
```

With hatchling, you can use VCS-based versioning:
```toml
[tool.hatch.version]
source = "vcs"  # Version from git tags (e.g., v1.2.3 → "1.2.3")
```

---

## Building the Package

```bash
# Install the build tool
pip install build

# Build both sdist (source) and wheel
python -m build

# Output:
# dist/
# ├── mypackage-1.2.3.tar.gz          (source distribution)
# └── mypackage-1.2.3-py3-none-any.whl  (wheel — binary distribution)
```

- **sdist** (`.tar.gz`): Source distribution — includes your source code. pip builds from this.
- **wheel** (`.whl`): Pre-built distribution — installs faster, no build step needed. The filename encodes Python version, ABI, and platform.
  - `py3-none-any` = Pure Python, any Python 3, any OS
  - `cp311-cp311-manylinux_2_28_x86_64` = CPython 3.11, Linux x86_64

```bash
# Install your package locally (for testing before publishing)
pip install dist/mypackage-1.2.3-py3-none-any.whl

# Or install directly from the directory
pip install .          # Copy install
pip install -e .       # Editable install
```

---

## A Complete Real-World pyproject.toml

Here is a complete, production-ready `pyproject.toml` for a FastAPI library:

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "fastapi-toolkit"
version = "0.3.1"
description = "Reusable components for FastAPI applications."
readme = "README.md"
license = {text = "MIT"}
requires-python = ">=3.10"
authors = [
    {name = "Jane Smith", email = "jane@example.com"},
]
keywords = ["fastapi", "web", "api", "async"]
classifiers = [
    "Development Status :: 4 - Beta",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
    "Programming Language :: Python :: 3.12",
    "Framework :: FastAPI",
    "Topic :: Internet :: WWW/HTTP",
]
dependencies = [
    "fastapi>=0.110.0",
    "pydantic>=2.0",
    "sqlalchemy>=2.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.0",
    "pytest-asyncio>=0.23",
    "pytest-cov>=4.0",
    "httpx>=0.27",
    "ruff>=0.4",
    "mypy>=1.9",
]
redis = ["redis>=5.0"]

[project.scripts]
fastapi-toolkit = "fastapi_toolkit.cli:main"

[project.urls]
Homepage = "https://github.com/janesmith/fastapi-toolkit"
Documentation = "https://fastapi-toolkit.readthedocs.io"
Repository = "https://github.com/janesmith/fastapi-toolkit"
"Bug Tracker" = "https://github.com/janesmith/fastapi-toolkit/issues"

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
addopts = "-v --cov=fastapi_toolkit --cov-report=term-missing"

[tool.mypy]
python_version = "3.11"
strict = true
ignore_missing_imports = true

[tool.ruff]
line-length = 88
target-version = "py310"

[tool.ruff.lint]
select = ["E", "F", "I", "UP", "N"]

[tool.black]
line-length = 88
target-version = ["py310", "py311", "py312"]
```

---

## Key Takeaways

- **`pyproject.toml` is the modern standard** for Python project configuration, replacing `setup.py`, `setup.cfg`, and scattered tool config files.
- **`[build-system]`** specifies the build backend (`setuptools`, `hatchling`, `flit`). This is required by PEP 517.
- **`[project]`** holds package metadata: name, version, description, dependencies, Python version requirements, and classifiers. This replaces `setup()` arguments.
- **`[project.optional-dependencies]`** defines extras (e.g., `dev`, `docs`, `redis`) installable with `pip install "package[dev]"`.
- **`[project.scripts]`** creates CLI entry points — executables installed into the venv's `bin/` on install.
- **`[tool.*]`** tables centralize configuration for pytest, mypy, ruff, black, and other tools — one file replaces many.
- **`python -m build`** produces a `.tar.gz` source distribution and a `.whl` wheel in the `dist/` directory.
- **`pip install .`** installs the package from the current directory. **`pip install -e .`** creates an editable install for development.
- Prefer `hatchling` or `setuptools` as the build backend for new projects. Both fully support `pyproject.toml`.
