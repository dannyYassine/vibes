---
title: "Descriptors"
description: "Control attribute access with Python's descriptor protocol."
duration_minutes: 30
order: 2
---

## What are Descriptors?

Descriptors are objects that define how attribute access works. They power `@property`, `@classmethod`, `@staticmethod`, and `__slots__`.

A descriptor implements any of these methods:
- `__get__(self, obj, objtype=None)` — attribute access
- `__set__(self, obj, value)` — attribute assignment
- `__delete__(self, obj)` — attribute deletion

## A Simple Descriptor

```python
class Verbose:
    def __get__(self, obj, objtype=None):
        print(f"Getting from {obj}")
        return obj._value

    def __set__(self, obj, value):
        print(f"Setting {value} on {obj}")
        obj._value = value

class MyClass:
    attr = Verbose()

m = MyClass()
m.attr = 42      # Setting 42 on <MyClass object>
print(m.attr)    # Getting from <MyClass object> → 42
```

## Data vs Non-Data Descriptors

- **Data descriptor**: Has `__set__` or `__delete__`
- **Non-data descriptor**: Only has `__get__`

Data descriptors take precedence over instance `__dict__`:

```python
class DataDesc:
    def __get__(self, obj, objtype=None):
        return "from descriptor"
    def __set__(self, obj, value):
        pass

class NonDataDesc:
    def __get__(self, obj, objtype=None):
        return "from descriptor"

class MyClass:
    data = DataDesc()
    nondata = NonDataDesc()

m = MyClass()
m.__dict__["data"] = "from instance"
m.__dict__["nondata"] = "from instance"

print(m.data)     # "from descriptor" (data desc wins)
print(m.nondata)  # "from instance" (instance dict wins)
```

## Practical Examples

### Typed Attributes

```python
class Typed:
    def __init__(self, name, expected_type):
        self.name = name
        self.expected_type = expected_type

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self.name)

    def __set__(self, obj, value):
        if not isinstance(value, self.expected_type):
            raise TypeError(
                f"{self.name} must be {self.expected_type.__name__}"
            )
        obj.__dict__[self.name] = value

class Person:
    name = Typed("name", str)
    age = Typed("age", int)

    def __init__(self, name, age):
        self.name = name
        self.age = age

p = Person("Alice", 30)    # OK
p = Person("Alice", "30")  # TypeError: age must be int
```

### Validated Numbers

```python
class Positive:
    def __init__(self, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self.name, 0)

    def __set__(self, obj, value):
        if value < 0:
            raise ValueError(f"{self.name} must be positive")
        obj.__dict__[self.name] = value

class Account:
    balance = Positive("balance")

    def __init__(self, balance):
        self.balance = balance

acc = Account(100)
acc.balance = -50  # ValueError: balance must be positive
```

### Lazy Evaluation

```python
class LazyProperty:
    def __init__(self, func):
        self.func = func
        self.name = func.__name__

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        value = self.func(obj)
        # Cache in instance dict (bypasses descriptor next time)
        obj.__dict__[self.name] = value
        return value

class DataProcessor:
    def __init__(self, data):
        self.data = data

    @LazyProperty
    def processed(self):
        print("Processing data...")
        return [x * 2 for x in self.data]

dp = DataProcessor([1, 2, 3])
print(dp.processed)  # Processing data... [2, 4, 6]
print(dp.processed)  # [2, 4, 6] (no processing, cached)
```

## How @property Works

`@property` is implemented using descriptors:

```python
class Property:
    def __init__(self, fget=None, fset=None, fdel=None):
        self.fget = fget
        self.fset = fset
        self.fdel = fdel

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        if self.fget is None:
            raise AttributeError("unreadable attribute")
        return self.fget(obj)

    def __set__(self, obj, value):
        if self.fset is None:
            raise AttributeError("can't set attribute")
        self.fset(obj, value)

    def setter(self, fset):
        return Property(self.fget, fset, self.fdel)

# Usage identical to @property
class Circle:
    def __init__(self, radius):
        self._radius = radius

    @Property
    def radius(self):
        return self._radius

    @radius.setter
    def radius(self, value):
        self._radius = value
```

## __set_name__ Hook

Automatically capture the attribute name:

```python
class Typed:
    def __init__(self, expected_type):
        self.expected_type = expected_type

    def __set_name__(self, owner, name):
        # Called when class is created
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj.__dict__.get(self.name)

    def __set__(self, obj, value):
        if not isinstance(value, self.expected_type):
            raise TypeError(f"{self.name} must be {self.expected_type}")
        obj.__dict__[self.name] = value

class Person:
    name = Typed(str)  # __set_name__ called with name="name"
    age = Typed(int)   # __set_name__ called with name="age"
```

## Descriptor Use in ORMs

ORMs use descriptors to map Python attributes to database columns:

```python
class Column:
    def __init__(self, column_type):
        self.column_type = column_type

    def __set_name__(self, owner, name):
        self.name = name

    def __get__(self, obj, objtype=None):
        if obj is None:
            return self
        return obj._data.get(self.name)

    def __set__(self, obj, value):
        obj._data[self.name] = value
        obj._dirty.add(self.name)

class Model:
    def __init__(self):
        self._data = {}
        self._dirty = set()

class User(Model):
    id = Column("INTEGER")
    name = Column("VARCHAR(100)")
    email = Column("VARCHAR(255)")
```

## Key Takeaways

1. Descriptors control attribute access via `__get__`, `__set__`, `__delete__`
2. Data descriptors (with `__set__`) override instance attributes
3. `@property`, `@classmethod`, `@staticmethod` are built on descriptors
4. Use `__set_name__` to auto-capture the attribute name
5. Descriptors enable validation, lazy evaluation, and ORM mappings
