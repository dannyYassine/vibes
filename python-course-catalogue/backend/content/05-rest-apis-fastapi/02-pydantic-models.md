---
title: "Pydantic Models"
description: "Define request and response schemas with Pydantic for validation and serialization."
duration_minutes: 30
order: 2
---

## Why Pydantic?

Pydantic provides:
- Data validation using Python type hints
- Automatic JSON serialization/deserialization
- Clear error messages for invalid data
- IDE autocompletion support
- OpenAPI schema generation

## Basic Models

```python
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class User(BaseModel):
    id: int
    username: str
    email: str
    is_active: bool = True
    created_at: Optional[datetime] = None

# Creating instances
user = User(
    id=1,
    username="alice",
    email="alice@example.com"
)

# Access attributes
print(user.username)  # alice
print(user.is_active)  # True (default)

# Convert to dict/JSON
user.model_dump()      # {'id': 1, 'username': 'alice', ...}
user.model_dump_json() # '{"id": 1, "username": "alice", ...}'
```

## Request Bodies

```python
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class ItemCreate(BaseModel):
    name: str
    price: float
    description: Optional[str] = None
    tax: Optional[float] = None

@app.post("/items")
def create_item(item: ItemCreate):
    # item is validated and typed
    total = item.price + (item.tax or 0)
    return {"name": item.name, "total": total}
```

## Response Models

```python
class ItemResponse(BaseModel):
    id: int
    name: str
    price: float

@app.get("/items/{item_id}", response_model=ItemResponse)
def get_item(item_id: int):
    # Only fields in ItemResponse are included
    return {
        "id": item_id,
        "name": "Widget",
        "price": 19.99,
        "internal_code": "W123"  # Excluded from response
    }
```

### Response Model Options

```python
@app.get("/items", response_model=list[ItemResponse])
def list_items():
    return [...]

@app.get("/items/{id}", response_model=ItemResponse, response_model_exclude_unset=True)
def get_item(id: int):
    # Only returns fields that were explicitly set
    pass

@app.get("/items/{id}", response_model=ItemResponse, response_model_exclude={"internal"})
def get_item(id: int):
    # Excludes specific fields
    pass
```

## Field Validation

```python
from pydantic import BaseModel, Field, EmailStr

class UserCreate(BaseModel):
    username: str = Field(
        ...,  # Required
        min_length=3,
        max_length=50,
        pattern="^[a-zA-Z0-9_]+$"
    )
    email: EmailStr
    age: int = Field(ge=0, le=150)
    password: str = Field(min_length=8)

class Product(BaseModel):
    name: str = Field(examples=["Widget"])
    price: float = Field(gt=0, description="Price in USD")
    quantity: int = Field(default=1, ge=0)
```

## Custom Validators

```python
from pydantic import BaseModel, field_validator, model_validator

class Order(BaseModel):
    items: list[str]
    total: float
    discount_code: Optional[str] = None

    @field_validator('items')
    @classmethod
    def items_not_empty(cls, v):
        if not v:
            raise ValueError('Order must have at least one item')
        return v

    @field_validator('total')
    @classmethod
    def total_positive(cls, v):
        if v <= 0:
            raise ValueError('Total must be positive')
        return round(v, 2)

    @model_validator(mode='after')
    def check_discount(self):
        if self.discount_code and self.total < 10:
            raise ValueError('Discount requires minimum $10 order')
        return self
```

## Nested Models

```python
class Address(BaseModel):
    street: str
    city: str
    country: str
    zip_code: str

class Company(BaseModel):
    name: str
    address: Address
    employees: list[str] = []

# Usage
company = Company(
    name="Acme Inc",
    address={
        "street": "123 Main St",
        "city": "NYC",
        "country": "USA",
        "zip_code": "10001"
    }
)
```

## Model Inheritance

```python
class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None

class UserInDB(UserBase):
    id: int
    hashed_password: str
    is_active: bool

class UserResponse(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True  # Enable ORM mode
```

## ORM Integration

```python
from sqlalchemy import Column, Integer, String
from pydantic import BaseModel

# SQLAlchemy model
class UserDB(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    email = Column(String)
    username = Column(String)

# Pydantic model with ORM support
class UserSchema(BaseModel):
    id: int
    email: str
    username: str

    class Config:
        from_attributes = True

# Convert ORM object to Pydantic
db_user = session.query(UserDB).first()
user_schema = UserSchema.model_validate(db_user)
```

## Generic Response Patterns

```python
from typing import Generic, TypeVar
from pydantic import BaseModel

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int

class ErrorResponse(BaseModel):
    detail: str
    code: str

@app.get("/users", response_model=PaginatedResponse[UserResponse])
def list_users(page: int = 1, size: int = 10):
    users = get_users(page, size)
    return {
        "items": users,
        "total": 100,
        "page": page,
        "page_size": size,
        "pages": 10
    }
```

## Computed Fields

```python
from pydantic import BaseModel, computed_field

class Rectangle(BaseModel):
    width: float
    height: float

    @computed_field
    @property
    def area(self) -> float:
        return self.width * self.height

rect = Rectangle(width=4, height=5)
print(rect.area)  # 20.0
print(rect.model_dump())  # {'width': 4, 'height': 5, 'area': 20.0}
```

## Key Takeaways

1. Pydantic models define and validate data structures
2. Use `Field()` for detailed validation rules
3. `@field_validator` and `@model_validator` for custom logic
4. Separate schemas: Create, Update, Response, InDB
5. `from_attributes = True` enables ORM compatibility
6. Response models filter what's returned to clients
