---
title: "Repository Pattern"
description: "Abstract data access logic behind repository interfaces."
duration_minutes: 25
order: 3
---

## What is the Repository Pattern?

The Repository pattern abstracts data storage, making business logic independent of the persistence mechanism.

```
Business Logic → Repository Interface → Repository Implementation → Database
```

## Basic Repository

```python
from abc import ABC, abstractmethod
from typing import Optional

class UserRepository(ABC):
    @abstractmethod
    def get_by_id(self, user_id: int) -> Optional[dict]: ...

    @abstractmethod
    def get_by_email(self, email: str) -> Optional[dict]: ...

    @abstractmethod
    def create(self, data: dict) -> dict: ...

    @abstractmethod
    def update(self, user_id: int, data: dict) -> Optional[dict]: ...

    @abstractmethod
    def delete(self, user_id: int) -> bool: ...
```

## SQLAlchemy Implementation

```python
from sqlalchemy.orm import Session
from app.models import User

class SQLUserRepository(UserRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_by_id(self, user_id: int) -> Optional[User]:
        return self.db.query(User).filter(User.id == user_id).first()

    def get_by_email(self, email: str) -> Optional[User]:
        return self.db.query(User).filter(User.email == email).first()

    def create(self, data: dict) -> User:
        user = User(**data)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def update(self, user_id: int, data: dict) -> Optional[User]:
        user = self.get_by_id(user_id)
        if not user:
            return None
        for key, value in data.items():
            setattr(user, key, value)
        self.db.commit()
        return user

    def delete(self, user_id: int) -> bool:
        user = self.get_by_id(user_id)
        if not user:
            return False
        self.db.delete(user)
        self.db.commit()
        return True
```

## In-Memory Implementation (for testing)

```python
class InMemoryUserRepository(UserRepository):
    def __init__(self):
        self._users: dict[int, dict] = {}
        self._next_id = 1

    def get_by_id(self, user_id: int) -> Optional[dict]:
        return self._users.get(user_id)

    def get_by_email(self, email: str) -> Optional[dict]:
        return next(
            (u for u in self._users.values() if u["email"] == email),
            None
        )

    def create(self, data: dict) -> dict:
        user = {"id": self._next_id, **data}
        self._users[self._next_id] = user
        self._next_id += 1
        return user

    def update(self, user_id: int, data: dict) -> Optional[dict]:
        if user_id not in self._users:
            return None
        self._users[user_id].update(data)
        return self._users[user_id]

    def delete(self, user_id: int) -> bool:
        return bool(self._users.pop(user_id, None))
```

## Usage with Dependency Injection

```python
from fastapi import Depends
from sqlalchemy.orm import Session

def get_user_repo(db: Session = Depends(get_db)) -> UserRepository:
    return SQLUserRepository(db)

@app.get("/users/{user_id}")
def get_user(
    user_id: int,
    repo: UserRepository = Depends(get_user_repo)
):
    user = repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404)
    return user

# Testing: swap in-memory repo
def test_get_user(client):
    repo = InMemoryUserRepository()
    repo.create({"id": 1, "name": "Alice", "email": "alice@example.com"})
    app.dependency_overrides[get_user_repo] = lambda: repo
    response = client.get("/users/1")
    assert response.status_code == 200
```

## Key Takeaways

1. Repository abstracts data access behind an interface
2. Business logic depends on the interface, not implementation
3. Enables swapping databases without changing business logic
4. In-memory repositories make unit testing fast
5. Use with dependency injection for clean, testable code
