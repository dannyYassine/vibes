---
title: "Pytest: Fixtures, Parametrize & conftest"
description: "Level up your pytest skills with advanced fixtures, parametrize, and test organization."
duration_minutes: 35
order: 1
---

## Pytest Basics Recap

Before diving into advanced features, here's the core of pytest:

- **Test discovery**: pytest finds tests in files named `test_*.py` or `*_test.py`, and functions/methods named `test_*`
- **Assert rewriting**: pytest rewrites `assert` statements to show actual values on failure — no need for `assertEqual`, `assertIn`, etc.
- **Running tests**:
  - `pytest` — run all tests
  - `pytest -v` — verbose output (test names)
  - `pytest -x` — stop after first failure
  - `pytest -s` — show print output (don't capture stdout)
  - `pytest -k "keyword"` — only run tests whose names contain "keyword"
  - `pytest tests/test_auth.py::test_login` — run a specific test

```python
# test_math.py
def test_addition():
    assert 1 + 1 == 2

def test_string():
    result = "hello world"
    assert "world" in result
    assert result.startswith("hello")

# On failure, pytest shows:
# AssertionError: assert 'hello' in 'goodbye world'
# Not just "AssertionError"
```

## @pytest.fixture: The Basics

A fixture is a function that provides a resource or setup to tests that request it. Tests declare fixtures they need by using the fixture's function name as a parameter.

```python
# test_user.py
import pytest

class UserService:
    def __init__(self):
        self.users = {}

    def create(self, name: str, email: str) -> dict:
        user = {"id": len(self.users) + 1, "name": name, "email": email}
        self.users[user["id"]] = user
        return user

    def get(self, user_id: int) -> dict | None:
        return self.users.get(user_id)

@pytest.fixture
def service():
    """Provide a fresh UserService for each test."""
    return UserService()

def test_create_user(service):  # pytest injects the fixture by name
    user = service.create("Alice", "alice@example.com")
    assert user["name"] == "Alice"
    assert user["id"] == 1

def test_get_user(service):
    service.create("Bob", "bob@example.com")
    user = service.get(1)
    assert user is not None
    assert user["name"] == "Bob"
```

Each test gets a **fresh** fixture instance — `test_create_user` and `test_get_user` each start with their own empty `UserService`.

## Fixtures with Setup and Teardown

Use `yield` to separate setup (before yield) from teardown (after yield):

```python
import pytest
import sqlite3
import tempfile
import os

@pytest.fixture
def db_connection():
    """Set up an in-memory SQLite database, yield the connection, then clean up."""
    # SETUP: runs before the test
    conn = sqlite3.connect(":memory:")
    conn.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL
        )
    """)
    conn.commit()

    yield conn  # The test runs here, with 'conn' as the fixture value

    # TEARDOWN: runs after the test (even if the test fails or raises)
    conn.close()

def test_insert_user(db_connection):
    db_connection.execute("INSERT INTO users (name, email) VALUES (?, ?)",
                          ("Alice", "alice@example.com"))
    db_connection.commit()
    cursor = db_connection.execute("SELECT COUNT(*) FROM users")
    assert cursor.fetchone()[0] == 1
```

The teardown code after `yield` is guaranteed to run even if the test body raises an exception. This makes fixtures the preferred way to manage resources in tests.

## Fixture Scope

By default, a fixture is created fresh for each test function. You can change this with the `scope` parameter:

```python
import pytest
import time

@pytest.fixture(scope="function")  # Default: one per test function
def function_scoped():
    print("\nfunction fixture setup")
    yield
    print("function fixture teardown")

@pytest.fixture(scope="class")  # One per test class
def class_scoped():
    print("\nclass fixture setup")
    yield
    print("class fixture teardown")

@pytest.fixture(scope="module")  # One per test file (module)
def module_scoped():
    print("\nmodule fixture setup")
    yield
    print("module fixture teardown")

@pytest.fixture(scope="session")  # One for the entire test session
def session_scoped():
    print("\nsession fixture setup")
    yield
    print("session fixture teardown")
```

Practical example — a session-scoped database for integration tests:

```python
import pytest

@pytest.fixture(scope="session")
def database_url():
    """Create and tear down a test database once for the entire session."""
    import tempfile
    import os

    db_file = tempfile.mktemp(suffix=".db")
    url = f"sqlite:///{db_file}"

    # One-time setup: create schema, seed data
    # ... database setup code ...

    yield url

    # One-time cleanup: remove test database file
    if os.path.exists(db_file):
        os.unlink(db_file)

@pytest.fixture(scope="function")
def db_session(database_url):
    """A per-test database transaction that is rolled back after the test."""
    # Use the session-scoped URL but create a function-scoped transaction
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    engine = create_engine(database_url)
    Session = sessionmaker(bind=engine)
    session = Session()
    session.begin_nested()  # Savepoint

    yield session

    session.rollback()  # Undo all changes made during the test
    session.close()
```

## autouse=True: Apply Without Explicit Request

`autouse=True` applies a fixture to every test in its scope without needing to list it as a parameter:

```python
import pytest
import os

@pytest.fixture(autouse=True)
def reset_environment():
    """Ensure a clean environment variable state for every test."""
    original_env = os.environ.copy()
    yield
    os.environ.clear()
    os.environ.update(original_env)

def test_reads_env_var():
    os.environ["MY_API_KEY"] = "test-key-123"
    import os as _os
    assert _os.environ["MY_API_KEY"] == "test-key-123"

def test_env_is_clean():
    # Even though the previous test set MY_API_KEY, this test sees a clean env
    assert "MY_API_KEY" not in os.environ
```

## Fixture Dependencies

Fixtures can declare other fixtures as dependencies:

```python
import pytest

@pytest.fixture
def db():
    return {"users": {}, "orders": {}}

@pytest.fixture
def user_service(db):  # Depends on db fixture
    class UserService:
        def create(self, name):
            uid = len(db["users"]) + 1
            db["users"][uid] = {"id": uid, "name": name}
            return db["users"][uid]
        def get(self, uid):
            return db["users"].get(uid)
    return UserService()

@pytest.fixture
def order_service(db, user_service):  # Depends on both
    class OrderService:
        def create(self, user_id, item):
            user = user_service.get(user_id)
            if not user:
                raise ValueError(f"User {user_id} not found")
            oid = len(db["orders"]) + 1
            db["orders"][oid] = {"id": oid, "user_id": user_id, "item": item}
            return db["orders"][oid]
    return OrderService()

def test_create_order(user_service, order_service):
    user = user_service.create("Alice")
    order = order_service.create(user["id"], "Widget")
    assert order["item"] == "Widget"
    assert order["user_id"] == user["id"]
```

## conftest.py: Shared Fixtures

`conftest.py` files are automatically discovered by pytest and provide fixtures to all tests in the same directory (and subdirectories). No import needed.

```
tests/
├── conftest.py          ← fixtures available to ALL tests in tests/
├── unit/
│   ├── conftest.py      ← fixtures available only to tests/unit/
│   └── test_models.py
└── integration/
    ├── conftest.py      ← fixtures available only to tests/integration/
    └── test_api.py
```

```python
# tests/conftest.py
import pytest

@pytest.fixture(scope="session")
def app():
    """Create the FastAPI app once for the session."""
    from myapp.main import create_app
    return create_app(testing=True)

@pytest.fixture
def client(app):
    """A fresh test client for each test."""
    from fastapi.testclient import TestClient
    with TestClient(app) as c:
        yield c

@pytest.fixture
def auth_headers(client):
    """Register and log in a test user, return auth headers."""
    client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "testpass123",
        "username": "testuser",
    })
    resp = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "testpass123",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
```

## @pytest.mark.parametrize: Run Tests with Multiple Inputs

Instead of writing separate tests for each input, parametrize lets you run one test function with multiple parameter sets:

```python
import pytest

def is_palindrome(s: str) -> bool:
    cleaned = "".join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]

@pytest.mark.parametrize("input_str, expected", [
    ("racecar", True),
    ("hello", False),
    ("A man a plan a canal Panama", True),
    ("Was it a car or a cat I saw", True),
    ("not a palindrome", False),
    ("", True),  # Edge case: empty string
    ("a", True),  # Edge case: single char
])
def test_is_palindrome(input_str, expected):
    assert is_palindrome(input_str) == expected
# Runs 7 tests: test_is_palindrome[racecar-True], test_is_palindrome[hello-False], ...
```

Multiple parameters with IDs:

```python
@pytest.mark.parametrize(
    "dividend, divisor, result",
    [
        pytest.param(10, 2, 5, id="ten-divided-by-two"),
        pytest.param(9, 3, 3, id="nine-divided-by-three"),
        pytest.param(-6, 2, -3, id="negative-dividend"),
    ],
)
def test_division(dividend, divisor, result):
    assert dividend / divisor == result
```

## Custom Marks

Custom marks let you categorize and filter tests:

```python
# pytest.ini or pyproject.toml — register your marks to avoid warnings
# [pytest]
# markers =
#     slow: tests that take more than 1 second
#     integration: tests that need external services
#     unit: fast, isolated unit tests

import pytest

@pytest.mark.slow
def test_heavy_computation():
    result = sum(i * i for i in range(10_000_000))
    assert result > 0

@pytest.mark.integration
def test_real_database():
    # ... connects to actual DB
    pass

@pytest.mark.unit
def test_pure_function():
    assert 2 + 2 == 4
```

Filter with `-m`:
```bash
pytest -m "not slow"          # Skip slow tests
pytest -m "unit"              # Only unit tests
pytest -m "integration and not slow"  # Combined conditions
```

## The monkeypatch Fixture

`monkeypatch` lets you temporarily replace attributes, environment variables, functions, and more — all changes are automatically undone after the test:

```python
import pytest
import os

def get_api_key() -> str:
    return os.environ.get("API_KEY", "default-key")

def fetch_data(url: str) -> dict:
    import urllib.request
    with urllib.request.urlopen(url) as resp:
        import json
        return json.loads(resp.read())

def test_api_key_from_env(monkeypatch):
    monkeypatch.setenv("API_KEY", "test-secret-key")
    assert get_api_key() == "test-secret-key"
    # After test, API_KEY env var is restored to its original value

def test_no_env_var(monkeypatch):
    monkeypatch.delenv("API_KEY", raising=False)  # raising=False: don't fail if not set
    assert get_api_key() == "default-key"

def test_fetch_data_mocked(monkeypatch):
    # Replace urllib.request.urlopen with a mock
    class FakeResponse:
        def read(self): return b'{"key": "value"}'
        def __enter__(self): return self
        def __exit__(self, *args): pass

    monkeypatch.setattr("urllib.request.urlopen", lambda *args, **kwargs: FakeResponse())
    result = fetch_data("https://example.com/api")
    assert result == {"key": "value"}
```

## tmp_path: Temporary Files and Directories

```python
import pytest
from pathlib import Path

def write_config(path: Path, settings: dict) -> None:
    import json
    (path / "config.json").write_text(json.dumps(settings))

def read_config(path: Path) -> dict:
    import json
    return json.loads((path / "config.json").read_text())

def test_config_roundtrip(tmp_path):
    # tmp_path is a pathlib.Path to a unique temporary directory
    # It is cleaned up after the test
    settings = {"debug": True, "port": 8080}
    write_config(tmp_path, settings)
    loaded = read_config(tmp_path)
    assert loaded == settings

def test_multiple_temp_files(tmp_path):
    # Create subdirectories and files
    subdir = tmp_path / "subdir"
    subdir.mkdir()
    (subdir / "file.txt").write_text("hello")
    assert (subdir / "file.txt").read_text() == "hello"
```

## capsys: Capture stdout/stderr

```python
import pytest

def greet(name: str) -> None:
    print(f"Hello, {name}!")
    import sys
    print("Error output", file=sys.stderr)

def test_prints_greeting(capsys):
    greet("World")
    captured = capsys.readouterr()  # Returns (out, err) named tuple
    assert "Hello, World!" in captured.out
    assert "Error output" in captured.err

    # You can call readouterr() multiple times to reset the capture buffer
    greet("Alice")
    captured = capsys.readouterr()
    assert "Alice" in captured.out
    assert "World" not in captured.out  # Buffer was reset
```

## @pytest.raises and @pytest.warns

```python
import pytest
import warnings

def divide(a: int, b: int) -> float:
    if b == 0:
        raise ZeroDivisionError("Cannot divide by zero")
    return a / b

def deprecated_function():
    warnings.warn("Use new_function() instead", DeprecationWarning, stacklevel=2)
    return 42

def test_raises_zero_division():
    with pytest.raises(ZeroDivisionError):
        divide(10, 0)

def test_raises_with_message():
    with pytest.raises(ZeroDivisionError, match="Cannot divide by zero"):
        divide(10, 0)

def test_raises_captures_exception():
    with pytest.raises(ZeroDivisionError) as exc_info:
        divide(10, 0)
    assert "zero" in str(exc_info.value).lower()
    assert exc_info.type is ZeroDivisionError

def test_deprecation_warning():
    with pytest.warns(DeprecationWarning, match="new_function"):
        result = deprecated_function()
    assert result == 42
```

## pytest-cov: Code Coverage

```bash
pip install pytest-cov

# Run tests with coverage for the 'src' directory
pytest --cov=src --cov-report=term-missing tests/

# Generate HTML report
pytest --cov=src --cov-report=html tests/
# Open htmlcov/index.html in a browser

# Fail if coverage drops below threshold
pytest --cov=src --cov-fail-under=80 tests/
```

Configure in `pyproject.toml`:
```toml
[tool.pytest.ini_options]
addopts = "--cov=src --cov-report=term-missing"

[tool.coverage.run]
omit = ["*/tests/*", "*/migrations/*"]

[tool.coverage.report]
fail_under = 80
```

## pytest-xdist: Parallel Test Execution

```bash
pip install pytest-xdist

# Run tests across 4 processes
pytest -n 4

# Automatically use all CPU cores
pytest -n auto
```

## Real Example: Testing a REST API

```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from myapp.main import app
from myapp.database import Base, get_db

TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="session")
def engine():
    e = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=e)
    yield e
    Base.metadata.drop_all(bind=e)

@pytest.fixture
def db_session(engine):
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def client(db_session):
    def override_get_db():
        yield db_session
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

@pytest.fixture
def registered_user(client):
    resp = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "username": "testuser",
        "password": "securepass123",
    })
    assert resp.status_code == 200
    return resp.json()

# tests/test_auth.py
def test_register(client):
    resp = client.post("/api/auth/register", json={
        "email": "new@example.com",
        "username": "newuser",
        "password": "password123",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data

def test_login(client, registered_user):
    resp = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "securepass123",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()

@pytest.mark.parametrize("bad_password", ["", "short", "a" * 200])
def test_login_wrong_password(client, registered_user, bad_password):
    resp = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": bad_password,
    })
    assert resp.status_code == 401
```

## Key Takeaways

- Pytest's assert rewriting provides rich failure messages without the need for `assertEqual`, `assertIn`, etc.
- `@pytest.fixture` with `yield` cleanly separates setup from teardown; teardown runs even if the test fails.
- Fixture `scope` (`function`, `class`, `module`, `session`) controls how often a fixture is set up and torn down — use broader scopes for expensive resources like database connections.
- `conftest.py` shares fixtures across multiple test files without imports — place it in the directory level that matches the desired scope.
- `@pytest.mark.parametrize` runs one test with multiple input/expected pairs, reducing boilerplate and improving coverage of edge cases.
- Custom marks (`@pytest.mark.slow`, `@pytest.mark.integration`) enable selective test execution with `-m`.
- `monkeypatch` is the go-to for replacing environment variables, module attributes, and functions in a test-safe, auto-reversing way.
- `tmp_path` provides a clean temporary directory for each test; `capsys` captures stdout/stderr.
- `pytest.raises` and `pytest.warns` are the standard way to assert that exceptions and warnings are raised.
- `pytest-cov` for coverage, `pytest-xdist` for parallel execution — both are essential for serious projects.
