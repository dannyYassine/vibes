---
title: "Routing and Path Parameters"
description: "Define API endpoints with FastAPI's intuitive routing system."
duration_minutes: 25
order: 1
---

## FastAPI Basics

FastAPI is a modern, fast web framework for building APIs:

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello, World!"}

@app.get("/items")
def read_items():
    return [{"id": 1, "name": "Item 1"}]
```

Run with: `uvicorn main:app --reload`

## HTTP Methods

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/items")
def list_items():
    return []

@app.post("/items")
def create_item():
    return {"id": 1}

@app.put("/items/{item_id}")
def update_item(item_id: int):
    return {"id": item_id}

@app.patch("/items/{item_id}")
def partial_update(item_id: int):
    return {"id": item_id}

@app.delete("/items/{item_id}")
def delete_item(item_id: int):
    return {"deleted": item_id}
```

## Path Parameters

Capture values from the URL path:

```python
@app.get("/users/{user_id}")
def get_user(user_id: int):
    return {"user_id": user_id}

@app.get("/files/{file_path:path}")
def read_file(file_path: str):
    # :path captures everything including /
    return {"file_path": file_path}
```

### Type Conversion

```python
# Automatic conversion and validation
@app.get("/items/{item_id}")
def get_item(item_id: int):  # Converts to int
    return {"item_id": item_id}

# GET /items/42 → {"item_id": 42}
# GET /items/foo → 422 Validation Error
```

### Enum Values

```python
from enum import Enum

class ModelName(str, Enum):
    alexnet = "alexnet"
    resnet = "resnet"
    lenet = "lenet"

@app.get("/models/{model_name}")
def get_model(model_name: ModelName):
    if model_name == ModelName.alexnet:
        return {"model": model_name, "message": "Deep Learning FTW!"}
    return {"model": model_name}
```

## Query Parameters

Parameters not in the path become query parameters:

```python
@app.get("/items")
def list_items(skip: int = 0, limit: int = 10):
    return {"skip": skip, "limit": limit}

# GET /items?skip=20&limit=50
```

### Optional Parameters

```python
from typing import Optional

@app.get("/items")
def list_items(
    skip: int = 0,
    limit: int = 10,
    search: Optional[str] = None
):
    if search:
        return {"search": search}
    return {"skip": skip, "limit": limit}
```

### Required Query Parameters

```python
@app.get("/items")
def list_items(category: str):  # No default = required
    return {"category": category}

# GET /items → 422 Validation Error
# GET /items?category=books → OK
```

### Boolean Parameters

```python
@app.get("/items")
def list_items(active: bool = True):
    return {"active": active}

# These all work:
# GET /items?active=true
# GET /items?active=True
# GET /items?active=1
# GET /items?active=yes
# GET /items?active=on
```

## Combining Path and Query Parameters

```python
@app.get("/users/{user_id}/items")
def get_user_items(
    user_id: int,
    skip: int = 0,
    limit: int = 10,
    active: bool = True
):
    return {
        "user_id": user_id,
        "skip": skip,
        "limit": limit,
        "active": active
    }
```

## Path Parameter Validation

```python
from fastapi import Path

@app.get("/items/{item_id}")
def get_item(
    item_id: int = Path(
        ...,  # Required
        title="Item ID",
        description="The ID of the item to retrieve",
        ge=1,  # Greater than or equal to 1
        le=1000  # Less than or equal to 1000
    )
):
    return {"item_id": item_id}
```

## Query Parameter Validation

```python
from fastapi import Query

@app.get("/items")
def list_items(
    q: Optional[str] = Query(
        None,
        min_length=3,
        max_length=50,
        regex="^[a-zA-Z]+$"
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100)
):
    return {"q": q, "skip": skip, "limit": limit}
```

### Multiple Values

```python
@app.get("/items")
def list_items(
    tags: list[str] = Query(default=[])
):
    return {"tags": tags}

# GET /items?tags=python&tags=fastapi
# → {"tags": ["python", "fastapi"]}
```

## Router Organization

Split routes into modules:

```python
# routers/users.py
from fastapi import APIRouter

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

@router.get("/")
def list_users():
    return []

@router.get("/{user_id}")
def get_user(user_id: int):
    return {"id": user_id}

# main.py
from fastapi import FastAPI
from routers import users, items

app = FastAPI()
app.include_router(users.router)
app.include_router(items.router, prefix="/api")
```

## Key Takeaways

1. Path parameters use `{param}` syntax in the route
2. Type hints enable automatic validation and conversion
3. Query parameters are function params not in path
4. Use `Path()` and `Query()` for detailed validation
5. Use `APIRouter` to organize routes into modules
6. Enums restrict parameters to specific values
