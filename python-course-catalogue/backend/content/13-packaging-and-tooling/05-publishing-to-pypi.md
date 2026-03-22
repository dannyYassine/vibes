---
title: "Publishing Packages to PyPI"
description: "Package and publish your Python library to PyPI for the world to use."
duration_minutes: 25
order: 5
---

## What is PyPI?

PyPI (the Python Package Index) is the official repository for Python packages, hosted at [pypi.org](https://pypi.org). When you run `pip install requests`, pip downloads from PyPI. It currently hosts over 500,000 projects.

Publishing to PyPI makes your library available to anyone in the world with a single `pip install your-package` command.

**TestPyPI** is a separate instance at [test.pypi.org](https://test.pypi.org) specifically for practice. Use it to test your publishing workflow without affecting the real PyPI. You need separate accounts for each.

---

## Prerequisites

Before publishing, make sure you have:

### 1. A Complete pyproject.toml

```toml
[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[project]
name = "my-unique-package-name"   # Must be unique on PyPI
version = "1.0.0"
description = "A short description of what this package does."
readme = "README.md"
license = {text = "MIT"}
requires-python = ">=3.9"
authors = [{name = "Your Name", email = "you@example.com"}]
dependencies = ["requests>=2.28"]
classifiers = [
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
]

[project.urls]
Repository = "https://github.com/you/my-package"
```

### 2. A README.md

PyPI displays your `README.md` as the long description on the project page. Write it well — it's the first thing potential users see.

```markdown
# my-package

A clear, concise description.

## Installation

```bash
pip install my-package
```

## Quick Start

```python
from mypackage import something
result = something.do_thing()
```

## Documentation

Full documentation at https://my-package.readthedocs.io
```

### 3. A LICENSE File

Every open-source package needs a license. Without one, users legally cannot use your code.

```
# LICENSE (MIT template)
MIT License

Copyright (c) 2024 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 4. A Unique Package Name

Check [pypi.org](https://pypi.org) first — if the name is taken, your upload will fail. Package names are case-insensitive and treat hyphens and underscores as equivalent (`my-package` and `my_package` are the same name on PyPI).

---

## Choosing a License

| License | Type | Key Characteristics |
|---|---|---|
| **MIT** | Permissive | Can use, modify, redistribute freely. Must include copyright notice. Most common. |
| **Apache 2.0** | Permissive | Like MIT but also provides an explicit patent license. Good for corporate environments. |
| **BSD 2/3-Clause** | Permissive | Similar to MIT. 3-Clause adds a non-endorsement clause. |
| **GPL v3** | Copyleft | Any project using your code must also be GPL. Forces open-sourcing derivatives. |
| **LGPL v3** | Weak Copyleft | Libraries can be used in proprietary software; modifications to the library must be open. |

For most open-source libraries, **MIT** is the right choice. It's the most permissive and widely understood.

---

## Versioning

Good versioning communicates the nature of changes to your users.

### Semantic Versioning (SemVer)

Format: `MAJOR.MINOR.PATCH` (e.g., `2.4.1`)

| Part | When to increment | Example |
|---|---|---|
| MAJOR | Breaking API changes | `1.x.x` → `2.0.0` |
| MINOR | New backwards-compatible features | `1.3.x` → `1.4.0` |
| PATCH | Backwards-compatible bug fixes | `1.3.2` → `1.3.3` |

### Calendar Versioning (CalVer)

Format: `YYYY.MM.DD` or `YYYY.MM.MICRO` (e.g., `2024.03.15`)

Used by: `pip`, `black`, `Ubuntu`. Suitable when release dates matter more than API compatibility signals.

### Pre-release Versions

```
1.0.0a1   # Alpha 1
1.0.0b2   # Beta 2
1.0.0rc1  # Release candidate 1
1.0.0     # Final release
```

Users don't get pre-releases by default. They must opt in:
```bash
pip install "mypackage>=1.0.0a1"
pip install mypackage --pre
```

---

## Building the Package

```bash
# Install the build tool (separate from your project)
pip install build

# Build both sdist and wheel
python -m build
```

This creates two files in `dist/`:

```
dist/
├── mypackage-1.0.0.tar.gz                    # sdist (source distribution)
└── mypackage-1.0.0-py3-none-any.whl          # wheel (binary distribution)
```

**sdist** (`.tar.gz`): Contains your source code. pip can build from this. Required for PyPI.

**wheel** (`.whl`): Pre-built, installs faster. The filename encodes compatibility:
- `py3` = any CPython 3.x
- `none` = no ABI requirements (pure Python)
- `any` = any operating system

For packages with C extensions, the wheel name includes the specific Python version, ABI, and platform (e.g., `mypackage-1.0.0-cp311-cp311-manylinux_2_28_x86_64.whl`).

---

## Checking Your Build

Before uploading, verify the package structure and metadata are correct:

```bash
pip install twine

# Check the built distributions
twine check dist/*

# Output if everything is fine:
# Checking dist/mypackage-1.0.0.tar.gz: PASSED
# Checking dist/mypackage-1.0.0-py3-none-any.whl: PASSED

# Common issues twine check catches:
# - README.md has invalid reStructuredText (if using .rst)
# - Missing required metadata fields
# - Malformed classifiers
```

You can also inspect the wheel contents:
```bash
# A wheel is a zip file — you can unzip it
unzip -l dist/mypackage-1.0.0-py3-none-any.whl

# Or install locally and verify it works
pip install dist/mypackage-1.0.0-py3-none-any.whl
python -c "import mypackage; print(mypackage.__version__)"
```

---

## Uploading to TestPyPI

Always test on TestPyPI before uploading to the real PyPI.

### Step 1: Create a TestPyPI Account

Go to [test.pypi.org/account/register/](https://test.pypi.org/account/register/) and create an account.

### Step 2: Create an API Token

Go to Account Settings → API tokens → Add API token. Scope it to the specific project or leave it as account-wide. Copy the token — it starts with `pypi-`.

### Step 3: Upload

```bash
# Upload to TestPyPI
twine upload --repository testpypi dist/*

# You'll be prompted for credentials:
# Username: __token__     (literally the string __token__)
# Password: pypi-...      (your API token)
```

### Step 4: Test the Install

```bash
# Install from TestPyPI
pip install --index-url https://test.pypi.org/simple/ mypackage

# If your package has dependencies from real PyPI, add it as a fallback:
pip install \
  --index-url https://test.pypi.org/simple/ \
  --extra-index-url https://pypi.org/simple/ \
  mypackage
```

---

## Uploading to PyPI

Once TestPyPI upload works correctly:

### Step 1: Create a PyPI Account

Go to [pypi.org/account/register/](https://pypi.org/account/register/).

### Step 2: Create an API Token

Account Settings → API tokens → Add API token. Use a project-scoped token after the first upload establishes the project name.

### Step 3: Upload

```bash
# Upload to PyPI (default repository)
twine upload dist/*

# Username: __token__
# Password: pypi-...  (your PyPI API token, not TestPyPI)
```

### Storing Credentials

Instead of typing credentials every time, store them in `~/.pypirc`:

```ini
[distutils]
index-servers =
    pypi
    testpypi

[pypi]
username = __token__
password = pypi-AgEIcHlwaS5vcmcCJGV4YW1wbGV0b2tlbgo...

[testpypi]
repository = https://test.pypi.org/legacy/
username = __token__
password = pypi-...
```

Or set environment variables (better for CI/CD):
```bash
export TWINE_USERNAME=__token__
export TWINE_PASSWORD=pypi-...
twine upload dist/*
```

### After Upload

Visit `https://pypi.org/project/your-package-name/` to see your package page.

Users can now install it:
```bash
pip install your-package-name
pip install "your-package-name==1.0.0"
```

---

## Automating with GitHub Actions

Manual publishing is error-prone. Automate it with GitHub Actions: trigger a release whenever you push a version tag.

```yaml
# .github/workflows/publish.yml
name: Publish to PyPI

on:
  push:
    tags:
      - 'v*'    # Triggers on tags like v1.0.0, v2.3.1, etc.

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - name: Install build tool
        run: pip install build twine

      - name: Build package
        run: python -m build

      - name: Check distribution
        run: twine check dist/*

      - name: Publish to PyPI
        env:
          TWINE_USERNAME: __token__
          TWINE_PASSWORD: ${{ secrets.PYPI_API_TOKEN }}
        run: twine upload dist/*
```

### Setting Up the Secret

In your GitHub repository: Settings → Secrets and variables → Actions → New repository secret.
- Name: `PYPI_API_TOKEN`
- Value: your PyPI API token (the `pypi-...` string)

### Publishing Workflow

```bash
# 1. Update version in pyproject.toml (or __init__.py)
# 2. Update CHANGELOG.md
# 3. Commit: git commit -m "Release v1.1.0"
# 4. Tag: git tag v1.1.0
# 5. Push tag: git push origin v1.1.0
# GitHub Actions builds and publishes automatically
```

### Using PyPI Trusted Publishers (Recommended)

The modern approach avoids long-lived API tokens entirely, using OpenID Connect (OIDC) to verify the GitHub Actions environment:

```yaml
# .github/workflows/publish.yml (OIDC approach)
jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      id-token: write    # Required for OIDC

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'

      - run: pip install build && python -m build

      - name: Publish to PyPI
        uses: pypa/gh-action-pypi-publish@release/v1
        # No token needed — PyPI trusts GitHub Actions via OIDC
```

Configure the trusted publisher on PyPI: your project page → Publishing → Add a new publisher → GitHub Actions.

---

## Maintaining Published Packages

### CHANGELOG.md

Keep a changelog that documents what changed in each release:

```markdown
# Changelog

## [1.2.0] - 2024-03-15
### Added
- Support for async context managers
- New `batch_process()` function

### Fixed
- Memory leak in connection pool

### Deprecated
- `old_function()` will be removed in 2.0.0

## [1.1.0] - 2024-01-20
### Added
- Redis cache backend
```

Follow [Keep a Changelog](https://keepachangelog.com) conventions.

### Yanking Bad Releases

If you publish a broken release, yank it instead of deleting it. A yanked release won't be installed by `pip install package` but can still be installed by pinning the exact version, and existing installs aren't broken.

```bash
# Via twine
twine yank mypackage 1.0.1

# Via the PyPI web interface: project page → History → yank the release
```

### Deprecation Warnings

Before removing a feature in a major release, warn users in the minor release before:

```python
import warnings

def old_function(x):
    warnings.warn(
        "old_function() is deprecated and will be removed in version 2.0. "
        "Use new_function() instead.",
        DeprecationWarning,
        stacklevel=2,   # Points to the caller's line, not this line
    )
    return new_function(x)
```

Users will see the warning when they call `old_function()` in Python 3.2+ if they run with `-W default` or `python -W error` (which turns warnings into errors — useful in CI).

---

## Project File Structure Checklist

Before publishing, your project should have:

```
mypackage/
├── src/
│   └── mypackage/
│       ├── __init__.py     # Contains __version__ = "1.0.0"
│       └── ...
├── tests/
│   └── ...
├── pyproject.toml          # Build config + metadata
├── README.md               # Long description for PyPI
├── LICENSE                 # License text (required)
├── CHANGELOG.md            # Release history (recommended)
└── .gitignore
```

Using the `src/` layout (with code inside `src/mypackage/` rather than just `mypackage/`) prevents accidental imports from the project root during development.

---

## Key Takeaways

- **PyPI** is the public Python package index. **TestPyPI** is the practice server — always test there first.
- **Prerequisites**: a complete `pyproject.toml`, a `README.md`, and a `LICENSE` file. The package name must be unique on PyPI.
- **Versioning**: use SemVer (`MAJOR.MINOR.PATCH`). Increment MAJOR for breaking changes, MINOR for new features, PATCH for bug fixes.
- **Building**: `pip install build && python -m build` creates a `.tar.gz` (sdist) and a `.whl` (wheel) in `dist/`.
- **Checking**: `twine check dist/*` validates your distributions before upload.
- **Uploading**: `twine upload dist/*` pushes to PyPI. Use `--repository testpypi` for TestPyPI. Always authenticate with API tokens, not your password.
- **Automate with GitHub Actions**: trigger on version tags (`v*`). Store your PyPI token as a GitHub secret. Better yet, use OIDC trusted publishers to avoid long-lived tokens.
- **Yanking** removes a broken release from the default install path without breaking pinned installs.
- **Add deprecation warnings** before removing features — give users at least one release cycle to migrate.
