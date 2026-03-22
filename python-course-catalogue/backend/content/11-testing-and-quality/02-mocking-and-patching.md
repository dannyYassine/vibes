---
title: "Mocking and Patching with unittest.mock"
description: "Isolate dependencies in tests using mocks, stubs, and patches."
duration_minutes: 30
order: 2
---

## Why Mock?

Real tests isolate the code under test from its dependencies. Without mocking:

- Tests that call external APIs fail if the service is down
- Tests that write to a database are slow and leave behind data
- Tests that depend on the current time are non-deterministic
- Tests that read from the filesystem are fragile and environment-dependent

Mocking replaces real dependencies with controlled fakes so your tests run fast, reliably, and in isolation.

```python
# Without mocking — fragile, slow, requires real service
def test_send_email_bad():
    from myapp.email import send_welcome_email
    result = send_welcome_email("user@example.com")  # Actually sends an email!
    assert result is True

# With mocking — fast, reliable, no side effects
from unittest.mock import patch

def test_send_email_good():
    with patch("myapp.email.smtp_client.send") as mock_send:
        mock_send.return_value = True
        from myapp.email import send_welcome_email
        result = send_welcome_email("user@example.com")
        assert result is True
        mock_send.assert_called_once()
```

## Mock vs MagicMock vs AsyncMock

`unittest.mock` provides three main classes:

```python
from unittest.mock import Mock, MagicMock, AsyncMock

# Mock: basic mock object
m = Mock()
m.some_method()          # OK, returns a new Mock
m.some_attribute         # OK, returns a new Mock
str(m)                   # Returns something like "<Mock id='...'>"
len(m)                   # Raises TypeError — Mock doesn't implement __len__

# MagicMock: like Mock but pre-configures magic methods
mm = MagicMock()
mm.some_method()         # OK
len(mm)                  # OK — returns 0 by default
str(mm)                  # OK
int(mm)                  # OK — returns 1 by default
for item in mm: pass     # OK — iterates (yields nothing)
with mm: pass            # OK — context manager protocol works
bool(mm)                 # True

# AsyncMock: for async functions (Python 3.8+)
am = AsyncMock()
import asyncio
result = asyncio.run(am())  # Returns a Mock, not a coroutine error
```

Use `Mock` when you want strict control and don't need magic methods. Use `MagicMock` (the default in `patch()`) when the code under test uses dunder methods. Use `AsyncMock` for patching `async def` functions.

## Configuring Return Values and Side Effects

```python
from unittest.mock import Mock, MagicMock

# return_value: what calling the mock returns
mock = Mock()
mock.return_value = 42
assert mock() == 42
assert mock(1, 2, 3) == 42  # Always returns 42 regardless of arguments

# Chaining attributes
mock.db.find_user.return_value = {"id": 1, "name": "Alice"}
user = mock.db.find_user(email="alice@example.com")
assert user["name"] == "Alice"

# side_effect with a list: return values in sequence
mock_seq = Mock()
mock_seq.side_effect = [10, 20, 30]
assert mock_seq() == 10
assert mock_seq() == 20
assert mock_seq() == 30
# mock_seq() would raise StopIteration on 4th call

# side_effect with an exception: always raises
mock_error = Mock()
mock_error.side_effect = ValueError("something went wrong")
try:
    mock_error()
except ValueError as e:
    assert str(e) == "something went wrong"

# side_effect with a function: called instead of returning return_value
def compute(x, y):
    return x * y

mock_func = Mock()
mock_func.side_effect = compute
assert mock_func(3, 4) == 12  # Calls compute(3, 4)
```

## Automatic Attribute Creation and spec=

By default, accessing any attribute on a Mock creates a new Mock. This can hide bugs where you call a non-existent method. Use `spec=` to restrict the mock to the interface of a real class:

```python
from unittest.mock import Mock

class RealService:
    def process(self, data: str) -> str:
        return data.upper()

    def validate(self, data: str) -> bool:
        return len(data) > 0

# Without spec: any attribute works, hides typos
unrestricted = Mock()
unrestricted.procss("data")  # Typo! But no error — creates a new Mock
unrestricted.nonexistent_method()  # No error!

# With spec: restricted to RealService's interface
restricted = Mock(spec=RealService)
restricted.process("hello")   # OK
restricted.validate("hello")  # OK

try:
    restricted.procss("data")  # Typo raises AttributeError immediately
except AttributeError as e:
    print(f"Caught: {e}")  # Mock object has no attribute 'procss'

try:
    restricted.nonexistent_method()  # AttributeError
except AttributeError:
    print("Correctly caught nonexistent method")
```

## Verifying Calls

After calling a mock, you can assert how it was used:

```python
from unittest.mock import Mock, call

mock = Mock()

# Call the mock
mock("hello", 42)
mock("world", key="value")

# Basic assertions
mock.assert_called()                        # Was called at least once
mock.assert_called_once()                   # Was called exactly once — FAILS (called twice)

# Inspect the most recent call
print(mock.call_count)  # 2
print(mock.call_args)   # call('world', key='value')  — most recent call

# Full call history
print(mock.call_args_list)
# [call('hello', 42), call('world', key='value')]

# Assert specific calls
mock2 = Mock()
mock2(1, 2, name="alice")
mock2.assert_called_once_with(1, 2, name="alice")    # Exact match
mock2.assert_called_with(1, 2, name="alice")          # Most recent call match

# Assert not called
not_called = Mock()
not_called.assert_not_called()  # Passes — was never called

# Assert call order across multiple mocks
from unittest.mock import MagicMock, call

parent = MagicMock()
parent.first(1)
parent.second(2)
parent.first(3)

# Check the order of calls on child mocks
assert parent.method_calls == [
    call.first(1),
    call.second(2),
    call.first(3),
]
```

## patch() as a Context Manager

`patch()` replaces a name in a module with a Mock for the duration of the `with` block:

```python
from unittest.mock import patch, MagicMock
import json

# Suppose our code does:
# import requests
# def get_user(user_id):
#     resp = requests.get(f"https://api.example.com/users/{user_id}")
#     resp.raise_for_status()
#     return resp.json()

def get_user(user_id: int) -> dict:
    import requests
    resp = requests.get(f"https://api.example.com/users/{user_id}")
    resp.raise_for_status()
    return resp.json()

def test_get_user():
    mock_response = MagicMock()
    mock_response.json.return_value = {"id": 1, "name": "Alice"}
    mock_response.raise_for_status.return_value = None

    with patch("__main__.requests.get", return_value=mock_response) as mock_get:
        user = get_user(1)
        assert user["name"] == "Alice"
        mock_get.assert_called_once_with("https://api.example.com/users/1")

test_get_user()
print("Test passed!")
```

## patch() as a Decorator

The decorator form is cleaner for test methods. The mock is passed as an argument (in reverse order from the decorators, bottom to top):

```python
from unittest.mock import patch, MagicMock
import pytest

def send_notification(user_email: str, message: str) -> bool:
    import smtplib
    with smtplib.SMTP("smtp.example.com", 587) as server:
        server.starttls()
        server.login("sender@example.com", "password")
        server.sendmail("sender@example.com", user_email, message)
    return True

@patch("smtplib.SMTP")
def test_send_notification(mock_smtp_class):
    # mock_smtp_class is the Mock for smtplib.SMTP
    mock_server = MagicMock()
    mock_smtp_class.return_value.__enter__.return_value = mock_server

    result = send_notification("user@example.com", "Hello!")

    assert result is True
    mock_server.starttls.assert_called_once()
    mock_server.login.assert_called_once()
    mock_server.sendmail.assert_called_once_with(
        "sender@example.com", "user@example.com", "Hello!"
    )

# Multiple patches — note bottom-to-top argument order
@patch("mymodule.requests.post")
@patch("mymodule.time.time")
def test_with_multiple_patches(mock_time, mock_post):
    # Bottom decorator → first extra argument
    # Top decorator → second extra argument
    mock_time.return_value = 1234567890
    mock_post.return_value.status_code = 201
    # ... test code ...
```

## patch.object(): Patch a Method on a Real Object

Use `patch.object()` when you have an instance and want to patch a specific method:

```python
from unittest.mock import patch

class DatabaseClient:
    def query(self, sql: str) -> list:
        # Real database call
        pass

def get_active_users(db: DatabaseClient) -> list:
    rows = db.query("SELECT * FROM users WHERE active = 1")
    return [{"id": row[0], "name": row[1]} for row in rows]

def test_get_active_users():
    db = DatabaseClient()
    fake_rows = [(1, "Alice"), (2, "Bob")]

    with patch.object(db, "query", return_value=fake_rows) as mock_query:
        users = get_active_users(db)
        assert len(users) == 2
        assert users[0]["name"] == "Alice"
        mock_query.assert_called_once_with("SELECT * FROM users WHERE active = 1")
```

## patch.dict(): Patch Dictionaries

```python
from unittest.mock import patch
import os

def get_database_url() -> str:
    return os.environ.get("DATABASE_URL", "sqlite:///default.db")

def test_with_custom_env():
    with patch.dict(os.environ, {"DATABASE_URL": "postgresql://localhost/test"}):
        url = get_database_url()
        assert url == "postgresql://localhost/test"
    # os.environ is restored after the block
    assert os.environ.get("DATABASE_URL") is None  # (if it wasn't set before)

# Also useful for mocking configuration dictionaries
CONFIG = {"timeout": 30, "retries": 3}

def test_config_overrides():
    with patch.dict(CONFIG, {"timeout": 5, "max_connections": 10}):
        assert CONFIG["timeout"] == 5       # Overridden
        assert CONFIG["retries"] == 3       # Unchanged
        assert CONFIG["max_connections"] == 10  # Added
    assert CONFIG["timeout"] == 30          # Restored
```

## The Golden Rule: Patch Where It Is Used

This is the most common mocking mistake. You must patch the name **as it appears in the module under test**, not where it is originally defined:

```python
# mymodule.py
from os.path import exists  # 'exists' is now bound to mymodule.exists

def file_exists(path: str) -> bool:
    return exists(path)
```

```python
# test_mymodule.py
from unittest.mock import patch

# BAD — patching the original location. mymodule.exists is unchanged
def test_bad():
    with patch("os.path.exists", return_value=True):
        import mymodule
        assert mymodule.file_exists("/nonexistent")  # FAILS — still uses real os.path.exists

# GOOD — patching where it's actually used
def test_good():
    with patch("mymodule.exists", return_value=True):
        import mymodule
        assert mymodule.file_exists("/nonexistent")  # PASSES
```

## create_autospec(): Safe Mocking with Signature Validation

`create_autospec()` creates a mock that validates call signatures against the real object:

```python
from unittest.mock import create_autospec

class EmailService:
    def send(self, recipient: str, subject: str, body: str) -> bool:
        """Send an email."""
        pass

    def send_bulk(self, recipients: list, subject: str, body: str) -> int:
        """Send to multiple recipients. Returns number sent."""
        pass

# create_autospec: mock that checks call signatures
mock_service = create_autospec(EmailService, instance=True)

# Correct call — OK
mock_service.send("user@example.com", "Hello", "Body text")

# Wrong number of arguments — raises TypeError immediately
try:
    mock_service.send("only", "two args")  # Missing 'body'
except TypeError as e:
    print(f"Caught: {e}")  # Missing required argument: 'body'

# Nonexistent attribute — raises AttributeError
try:
    mock_service.nonexistent_method()
except AttributeError as e:
    print(f"Caught: {e}")
```

## Mocking datetime.now()

`datetime.now()` is notoriously tricky to mock because `datetime` is a C type:

```python
from unittest.mock import patch, MagicMock
from datetime import datetime

def get_current_year() -> int:
    return datetime.now().year

# BAD — TypeError: cannot set 'now' attribute of immutable type
# with patch("datetime.datetime.now", ...):

# GOOD — patch the entire datetime class in the module that uses it
def test_current_year():
    fake_now = datetime(2024, 6, 15, 12, 0, 0)

    with patch("__main__.datetime") as mock_datetime:
        mock_datetime.now.return_value = fake_now
        year = get_current_year()
        assert year == 2024

# Alternative: freeze_time library (pip install freezegun)
# from freezegun import freeze_time
# @freeze_time("2024-06-15")
# def test_current_year_frozen():
#     assert get_current_year() == 2024
```

## Mocking requests

```python
from unittest.mock import patch, MagicMock
import pytest

def get_github_repos(username: str) -> list:
    import requests
    resp = requests.get(f"https://api.github.com/users/{username}/repos")
    resp.raise_for_status()
    return resp.json()

def test_get_github_repos_success():
    fake_repos = [
        {"name": "my-project", "stars": 42},
        {"name": "another-repo", "stars": 7},
    ]
    mock_response = MagicMock()
    mock_response.json.return_value = fake_repos
    mock_response.raise_for_status.return_value = None
    mock_response.status_code = 200

    with patch("requests.get", return_value=mock_response) as mock_get:
        repos = get_github_repos("octocat")
        assert len(repos) == 2
        assert repos[0]["name"] == "my-project"
        mock_get.assert_called_once_with(
            "https://api.github.com/users/octocat/repos"
        )

def test_get_github_repos_http_error():
    import requests
    mock_response = MagicMock()
    mock_response.raise_for_status.side_effect = requests.HTTPError("404 Not Found")

    with patch("requests.get", return_value=mock_response):
        with pytest.raises(requests.HTTPError, match="404 Not Found"):
            get_github_repos("nonexistent-user-xyz")
```

## Mocking Async Functions

```python
from unittest.mock import AsyncMock, patch
import asyncio
import pytest

async def fetch_user_async(user_id: int) -> dict:
    import aiohttp
    async with aiohttp.ClientSession() as session:
        async with session.get(f"https://api.example.com/users/{user_id}") as resp:
            return await resp.json()

@pytest.mark.asyncio
async def test_fetch_user_async():
    fake_user = {"id": 1, "name": "Alice"}

    mock_session = AsyncMock()
    mock_response = AsyncMock()
    mock_response.json.return_value = fake_user
    mock_session.__aenter__.return_value = mock_session
    mock_session.get.return_value.__aenter__.return_value = mock_response

    with patch("aiohttp.ClientSession", return_value=mock_session):
        user = await fetch_user_async(1)
        assert user["name"] == "Alice"
```

## Pitfalls: Over-Mocking

Over-mocking creates brittle tests that test your mocks, not your code:

```python
# BAD: mocking everything, testing nothing real
def test_over_mocked(mocker):
    mock_a = mocker.patch("myapp.service_a.process")
    mock_b = mocker.patch("myapp.service_b.validate")
    mock_c = mocker.patch("myapp.repository.save")

    mock_a.return_value = {"processed": True}
    mock_b.return_value = True
    mock_c.return_value = {"id": 1}

    from myapp import controller
    result = controller.handle_request({"data": "input"})

    # This test passes even if the controller has bugs —
    # all its dependencies are mocked, so nothing real runs.
    assert result is not None

# BETTER: only mock external I/O (HTTP, DB); let business logic run for real
def test_balanced_mocking(mocker):
    # Only mock the database save — let business logic run
    mock_save = mocker.patch("myapp.repository.save")
    mock_save.return_value = {"id": 1}

    from myapp import controller
    result = controller.handle_request({"name": "Alice", "email": "alice@example.com"})

    # Now the validation and processing logic is actually tested
    assert result["id"] == 1
    saved_data = mock_save.call_args[0][0]
    assert saved_data["name"] == "Alice"
```

The rule of thumb: mock external services, infrastructure (HTTP, DB, file system, time), and non-deterministic behavior. Let your actual business logic run.

## Key Takeaways

- `Mock()` records calls; `MagicMock()` also implements magic methods (`__len__`, `__enter__`, etc.); `AsyncMock()` is for async functions.
- `mock.return_value = x` sets what the mock returns when called. `mock.side_effect` accepts a list (sequential returns), an exception (always raises), or a callable (delegates).
- `spec=SomeClass` and `create_autospec(SomeClass)` restrict the mock to the real class's interface, catching typos and wrong signatures immediately.
- `mock.assert_called_once_with(...)`, `assert_called_with(...)`, `assert_not_called()` verify how the mock was used.
- `patch("module.name")` replaces a name in a module — use as context manager or decorator. `patch.object(instance, "method")` patches a method on an existing object.
- The golden rule: **patch where the name is used** (e.g., `mymodule.requests.get`), not where it is defined (`requests.get`).
- `patch.dict()` is the clean way to patch environment variables and dictionaries.
- `AsyncMock` handles async functions correctly; a plain `Mock` would return a coroutine object instead of being awaitable.
- Over-mocking makes tests brittle and unhelpful. Mock external I/O and non-determinism; let real business logic run.
