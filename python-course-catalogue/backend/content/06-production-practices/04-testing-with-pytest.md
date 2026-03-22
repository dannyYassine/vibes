---
title: "Testing with pytest"
description: "Write comprehensive tests for Python applications using pytest."
duration_minutes: 35
order: 4
---

## pytest Basics

```bash
pip install pytest pytest-asyncio httpx
```

```python
# test_math.py
def add(a, b):
    return a + b

def test_add():
    assert add(2, 3) == 5

def test_add_negative():
    assert add(-1, 1) == 0

class TestAdd:
    def test_integers(self):
        assert add(1, 2) == 3

    def test_floats(self):
        assert add(1.5, 2.5) == 4.0
```

```bash
pytest              # Run all tests
pytest -v           # Verbose output
pytest test_math.py # Run specific file
pytest -k "add"     # Run matching tests
pytest -x           # Stop on first failure
```

## Fixtures

```python
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(engine)

def test_create_user(db_session):
    user = User(name="Alice", email="alice@example.com")
    db_session.add(user)
    db_session.commit()
    assert user.id is not None
```

## Testing FastAPI

```python
# conftest.py
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(bind=engine)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def client(db):
    def override_get_db():
        yield db
    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()
```

```python
# test_auth.py
def test_register(client):
    response = client.post("/api/auth/register", json={
        "email": "alice@example.com",
        "username": "alice",
        "password": "securepass123"
    })
    assert response.status_code == 201
    assert "access_token" in response.json()

def test_login(client):
    # First register
    client.post("/api/auth/register", json={
        "email": "alice@example.com",
        "username": "alice",
        "password": "securepass123"
    })
    # Then login
    response = client.post("/api/auth/login", json={
        "email": "alice@example.com",
        "password": "securepass123"
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
```

## Parametrized Tests

```python
import pytest

@pytest.mark.parametrize("input,expected", [
    (2, 4),
    (3, 9),
    (4, 16),
    (-2, 4),
])
def test_square(input, expected):
    assert input ** 2 == expected

@pytest.mark.parametrize("email", [
    "notanemail",
    "missing@",
    "@nodomain.com",
    "",
])
def test_invalid_email(client, email):
    response = client.post("/api/auth/register", json={
        "email": email,
        "username": "alice",
        "password": "pass"
    })
    assert response.status_code == 422
```

## Mocking

```python
from unittest.mock import patch, MagicMock

def test_send_email_called(client):
    with patch("app.services.email.send_email") as mock_send:
        client.post("/api/auth/register", json={...})
        mock_send.assert_called_once()

def test_external_api(client):
    mock_response = MagicMock()
    mock_response.json.return_value = {"data": "value"}
    mock_response.status_code = 200

    with patch("httpx.get", return_value=mock_response):
        response = client.get("/api/external-data")
        assert response.status_code == 200
```

## Key Takeaways

1. pytest uses `assert` for simple, readable tests
2. Fixtures provide setup/teardown with `yield`
3. `TestClient` from fastapi/starlette for API tests
4. Use `dependency_overrides` to inject test dependencies
5. Parametrize to test multiple inputs concisely
6. Mock external services to keep tests fast and isolated
