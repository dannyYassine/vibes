---
title: "Virtual Environments and pip"
description: "Isolate project dependencies with virtual environments and manage packages with pip."
duration_minutes: 20
order: 1
---

## The Problem with Global Package Installation

When you install Python, you get a system-wide Python interpreter and a global `site-packages` directory where packages are installed. Installing packages globally causes two serious problems:

**Dependency conflicts**: Project A needs `requests==2.28` and Project B needs `requests==2.32`. You can only have one version globally — one project will always be broken.

**System pollution**: Many operating systems (macOS, Linux) depend on their bundled Python for system tools. Installing packages globally can break those tools in ways that are hard to diagnose.

The solution: **virtual environments** — isolated Python installations per project.

---

## venv: Python's Built-In Virtual Environment Tool

`venv` is included in Python 3.3+ and is the standard tool for creating virtual environments.

### Creating a Virtual Environment

```bash
# Navigate to your project directory
cd my-project

# Create a virtual environment named .venv
# .venv is the convention — hidden by default, easy to .gitignore
python -m venv .venv

# You can also specify a different Python version (if installed)
python3.11 -m venv .venv
```

This creates a `.venv/` directory containing:
- A copy (or symlink) of the Python interpreter
- An isolated `pip`
- An isolated `site-packages/` directory
- Activation scripts for different shells

### Activating the Environment

You must activate the environment to use it. Activation modifies your `PATH` to point to the venv's Python and pip first.

```bash
# macOS / Linux (bash or zsh)
source .venv/bin/activate

# Windows (Command Prompt)
.venv\Scripts\activate.bat

# Windows (PowerShell)
.venv\Scripts\Activate.ps1

# Fish shell
source .venv/bin/activate.fish
```

After activation, your prompt changes:
```
(.venv) user@machine:~/my-project$
```

Now `python` and `pip` refer to the isolated versions:
```bash
which python   # /Users/you/my-project/.venv/bin/python
which pip      # /Users/you/my-project/.venv/bin/pip
python --version  # Python 3.12.1
```

### Deactivating

```bash
deactivate
# Prompt returns to normal
# python and pip now refer to the system versions again
```

### Removing a Virtual Environment

A venv is just a directory. Delete it to remove it entirely:
```bash
rm -rf .venv
```

---

## What a venv Contains

```
.venv/
├── bin/              (or Scripts/ on Windows)
│   ├── python        → symlink to system Python
│   ├── python3       → same
│   ├── pip
│   ├── activate      ← the activation script
│   └── ...           ← scripts for installed packages (black, pytest, etc.)
├── include/          ← C headers for packages with C extensions
├── lib/
│   └── python3.12/
│       └── site-packages/  ← all installed packages go here
└── pyvenv.cfg        ← metadata (Python version, base interpreter path)
```

The `pyvenv.cfg` file is what makes it a venv — it tells Python to use the local `site-packages` instead of the system's.

---

## pip: The Package Installer

`pip` is Python's standard package installer. It downloads packages from PyPI (Python Package Index) at pypi.org.

### Installing Packages

```bash
# Install the latest version
pip install requests

# Install a specific version
pip install requests==2.31.0

# Install with version constraints
pip install "requests>=2.28"
pip install "requests>=2.28,<3.0"
pip install "requests~=2.28"    # Compatible release: >=2.28, <3.0

# Install multiple packages at once
pip install fastapi uvicorn sqlalchemy

# Install from a GitHub repository
pip install git+https://github.com/psf/requests.git

# Install from a local directory (useful for local packages)
pip install ./my-local-package
```

### Upgrading and Uninstalling

```bash
# Upgrade to latest version
pip install --upgrade requests

# Upgrade pip itself
pip install --upgrade pip

# Uninstall a package
pip uninstall requests

# Uninstall without confirmation prompt
pip uninstall -y requests
```

### Inspecting Your Environment

```bash
# List all installed packages and their versions
pip list

# Show details about a specific package
pip show requests

# Output:
# Name: requests
# Version: 2.31.0
# Summary: Python HTTP for Humans.
# Home-page: https://requests.readthedocs.io
# Author: Kenneth Reitz
# License: Apache 2.0
# Location: /Users/you/.venv/lib/python3.12/site-packages
# Requires: certifi, charset-normalizer, idna, urllib3
# Required-by: ...

# Check for outdated packages
pip list --outdated

# Verify that all installed packages have consistent dependencies
pip check
```

---

## requirements.txt: Recording Dependencies

A `requirements.txt` file lists the packages your project needs. It allows anyone to recreate your exact environment.

### Generating requirements.txt

```bash
# Capture exact versions of everything installed
pip freeze > requirements.txt

# Example output:
# annotated-types==0.6.0
# anyio==4.3.0
# certifi==2024.2.2
# ...
# requests==2.31.0
# ...
```

### Installing from requirements.txt

```bash
# Install all packages listed in requirements.txt
pip install -r requirements.txt
```

### Pitfall: pip freeze Includes Transitive Dependencies

`pip freeze` outputs every installed package, including dependencies of your dependencies. This means if you update a dependency and it pulls in a different transitive version, your `requirements.txt` changes even though you didn't change your direct dependencies.

For small projects, `pip freeze` is fine. For larger projects, consider managing direct dependencies manually or using `pip-tools` (see below).

### Manual requirements.txt

You can write `requirements.txt` by hand, listing only your direct dependencies:

```
# requirements.txt
fastapi>=0.110.0
sqlalchemy>=2.0.0
pydantic-settings>=2.0.0
uvicorn[standard]>=0.29.0
```

Then use `pip freeze > requirements.lock` for the exact reproducible snapshot.

### pip-tools: Better requirements.txt Management

```bash
pip install pip-tools
```

```
# requirements.in — your direct dependencies (written by hand)
requests>=2.28
fastapi
pytest
```

```bash
# Resolve and pin all transitive deps
pip-compile requirements.in
# Generates requirements.txt with exact pinned versions

# Install from the compiled file
pip-sync requirements.txt
```

This separates your intent (loose constraints) from the reproducible snapshot (exact pins).

---

## Version Specifiers

| Specifier | Meaning | Example |
|---|---|---|
| `==` | Exact version | `requests==2.31.0` |
| `>=` | Minimum version | `requests>=2.28` |
| `<=` | Maximum version | `requests<=3.0` |
| `!=` | Exclude version | `requests!=2.29.0` |
| `~=` | Compatible release | `requests~=2.28` → `>=2.28, <3.0` |
| `~=` (patch) | Compatible patch | `requests~=2.28.1` → `>=2.28.1, <2.29` |
| `>` | Strictly greater | `requests>2.0` |
| `<` | Strictly less | `requests<3.0` |

The `~=` (compatible release) operator is useful in `requirements.txt` to allow patch updates but not breaking changes.

---

## Editable Installs: pip install -e .

When developing a Python package locally, you want changes to your source code to be immediately reflected without reinstalling. Editable installs link the package directory into `site-packages` rather than copying it.

```bash
# Install the package in the current directory as editable
pip install -e .

# Install with optional extras (dev dependencies defined in pyproject.toml)
pip install -e ".[dev]"
```

After an editable install, editing your package's source files takes effect immediately — no reinstall needed. This is the standard workflow for developing a package you're also using.

---

## .gitignore: What to Exclude

Never commit your virtual environment to version control:

```
# .gitignore

# Virtual environments
.venv/
venv/
env/
ENV/

# Python cache
__pycache__/
*.pyc
*.pyo
*.pyd

# Distribution / packaging
dist/
build/
*.egg-info/

# Jupyter
.ipynb_checkpoints/

# Environment variables (secrets)
.env
```

The virtual environment can always be recreated from `requirements.txt`. Committing it would:
- Bloat your repository by hundreds of megabytes
- Commit absolute paths that break on other machines
- Commit binary files that change between OS platforms

---

## pipx: Global CLI Tool Installation

`pipx` installs CLI tools written in Python into their own isolated virtual environments and exposes their entry points globally. This is the correct way to install tools like `black`, `mypy`, `ruff`, or `cookiecutter` — you want them available everywhere but not polluting any project's environment.

```bash
# Install pipx
pip install pipx
pipx ensurepath  # Adds ~/.local/bin to PATH

# Install a CLI tool globally (each gets its own isolated env)
pipx install black
pipx install ruff
pipx install mypy
pipx install cookiecutter

# Run the tool from anywhere
black my_project/
ruff check .
mypy src/

# Upgrade a tool
pipx upgrade black

# List installed tools
pipx list

# Run a one-off command without permanently installing
pipx run black --check myfile.py
```

---

## Typical Project Setup Workflow

Here is the end-to-end workflow for a new Python project:

```bash
# 1. Create project directory
mkdir my-api
cd my-api

# 2. Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate

# 3. Install dependencies
pip install fastapi uvicorn sqlalchemy pydantic-settings

# 4. Install dev tools
pip install pytest ruff black mypy

# 5. Freeze exact versions
pip freeze > requirements.txt

# 6. Create .gitignore
echo ".venv/" >> .gitignore
echo "__pycache__/" >> .gitignore
echo "*.pyc" >> .gitignore

# 7. Start coding...
# When you return to the project later:
source .venv/bin/activate

# To share the project with a colleague:
# They run: pip install -r requirements.txt
```

---

## Key Takeaways

- **Always use a virtual environment for every project.** Never install project dependencies globally.
- **`python -m venv .venv`** creates an isolated environment. **`source .venv/bin/activate`** (Unix) or **`.venv\Scripts\activate`** (Windows) activates it.
- **`pip install`** installs packages into the active environment only. They are invisible to other environments.
- **`pip freeze > requirements.txt`** captures the exact installed state. **`pip install -r requirements.txt`** restores it.
- **`pip freeze` includes transitive dependencies.** For projects with complex dependencies, use `pip-tools` to separate your direct deps from the resolved lockfile.
- **Version specifiers**: `==` for exact pins, `>=` for minimums, `~=` for compatible releases. Use constraints that balance reproducibility and flexibility.
- **`pip install -e .`** is the right way to develop a package locally — changes take effect immediately.
- **Never commit `.venv/` to git.** It's large, platform-specific, and easily recreated from `requirements.txt`.
- **Use `pipx`** for global CLI tools (`black`, `ruff`, `mypy`) to keep them isolated from project environments.
