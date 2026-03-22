---
title: "Dependency Injection"
description: "Share logic across endpoints with FastAPI's powerful dependency system."
duration_minutes: 30
order: 3
---

## What is Dependency Injection?

Dependency injection lets you declare what your endpoint needs, and FastAPI provides it:

```python
from fastapi import Depends, FastAPI

app = FastAPI()

def get_db():
    db = Database()
    try:
        yield db
    finally:
        db.close()

@app.get("/users")
def list_users(db = Depends(get_db)):
    return db.query("SELECT * FROM users")
```

## Simple Dependencies

### Query Parameter Dependencies

```python
def pagination(skip: int = 0, limit: int = 100):
    return {"skip": skip, "limit": limit}

@app.get("/items")
def list_items(pagination: dict = Depends(pagination)):
    return {"pagination": pagination}

# Or unpack directly
@app.get("/users")
def list_users(skip: int = 0, limit: int = 100):
    # Common params repeated...
    pass
```

### Reusable Dependencies

```python
from typing import Annotated

# Create reusable dependency type
PaginationDep = Annotated[dict, Depends(pagination)]

@app.get("/items")
def list_items(page: PaginationDep):
    return {"skip": page["skip"], "limit": page["limit"]}

@app.get("/users")
def list_users(page: PaginationDep):
    return {"skip": page["skip"], "limit": page["limit"]}
```

## Class-Based Dependencies

```python
class Pagination:
    def __init__(self, skip: int = 0, limit: int = 100):
        self.skip = skip
        self.limit = limit

@app.get("/items")
def list_items(pagination: Pagination = Depends()):
    return {"skip": pagination.skip, "limit": pagination.limit}
```

## Database Sessions

```python
from sqlalchemy.orm import Session
from database import SessionLocal

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

DBSession = Annotated[Session, Depends(get_db)]

@app.get("/users/{user_id}")
def get_user(user_id: int, db: DBSession):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404)
    return user
```

## Authentication Dependencies

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

bearer_scheme = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    user = verify_token(token, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
    return user

CurrentUser = Annotated[User, Depends(get_current_user)]

@app.get("/me")
def get_me(current_user: CurrentUser):
    return current_user

@app.get("/items")
def list_items(current_user: CurrentUser, db: DBSession):
    return db.query(Item).filter(Item.owner_id == current_user.id).all()
```

### Optional Authentication

```python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

bearer_scheme = HTTPBearer(auto_error=False)

def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not credentials:
        return None
    return verify_token(credentials.credentials, db)

@app.get("/items")
def list_items(user: Optional[User] = Depends(get_optional_user)):
    if user:
        return {"items": [...], "personalized": True}
    return {"items": [...], "personalized": False}
```

## Nested Dependencies

Dependencies can depend on other dependencies:

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user(db: Session = Depends(get_db)):
    # Uses db dependency
    return user

def get_current_active_user(user: User = Depends(get_current_user)):
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return user

@app.get("/admin")
def admin_panel(user: User = Depends(get_current_active_user)):
    return {"admin": True}
```

## Path Operation Dependencies

Apply dependencies to all operations:

```python
async def verify_api_key(x_api_key: str = Header(...)):
    if x_api_key != "secret-key":
        raise HTTPException(status_code=403)

# Apply to single endpoint
@app.get("/secure", dependencies=[Depends(verify_api_key)])
def secure_endpoint():
    return {"secure": True}

# Apply to router
router = APIRouter(
    prefix="/admin",
    dependencies=[Depends(get_current_admin_user)]
)

# Apply to entire app
app = FastAPI(dependencies=[Depends(verify_api_key)])
```

## Dependency with yield (Context Managers)

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_http_client():
    async with httpx.AsyncClient() as client:
        yield client

@app.get("/external")
async def fetch_external(client = Depends(get_http_client)):
    response = await client.get("https://api.example.com")
    return response.json()
```

## Parameterized Dependencies

```python
def require_role(required_role: str):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role != required_role:
            raise HTTPException(
                status_code=403,
                detail=f"Role {required_role} required"
            )
        return current_user
    return role_checker

@app.get("/admin")
def admin_panel(user: User = Depends(require_role("admin"))):
    return {"admin": True}

@app.get("/moderator")
def moderator_panel(user: User = Depends(require_role("moderator"))):
    return {"moderator": True}
```

## Testing with Dependencies

```python
from fastapi.testclient import TestClient

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def override_get_current_user():
    return User(id=1, username="testuser")

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user

client = TestClient(app)

def test_read_items():
    response = client.get("/items")
    assert response.status_code == 200
```

## Key Takeaways

1. `Depends()` declares dependencies that FastAPI injects
2. Use `yield` for cleanup (database sessions, connections)
3. Dependencies can be nested and chained
4. `Annotated[Type, Depends()]` creates reusable dependency types
5. Apply dependencies at endpoint, router, or app level
6. Override dependencies in tests with `dependency_overrides`
