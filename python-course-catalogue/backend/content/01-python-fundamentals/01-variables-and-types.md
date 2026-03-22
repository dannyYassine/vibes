---
title: "Variables and Data Types"
description: "Learn about Python's dynamic typing system and fundamental data types."
duration_minutes: 20
order: 1
---

## What are Variables?

Variables in Python are names that refer to values stored in memory. Unlike statically-typed languages, Python uses **dynamic typing** — you don't declare types explicitly.

```python
# Creating variables
name = "Alice"
age = 30
height = 5.9
is_student = False
```

## Core Data Types

### Numbers

Python has three numeric types:

```python
# Integers - whole numbers of any size
count = 42
big_number = 10_000_000  # underscores for readability

# Floats - decimal numbers
price = 19.99
scientific = 1.5e-10

# Complex numbers
z = 3 + 4j
```

### Strings

Strings are immutable sequences of characters:

```python
# String creation
single = 'Hello'
double = "World"
multiline = """This spans
multiple lines"""

# String operations
greeting = single + " " + double  # concatenation
repeated = "ha" * 3               # "hahaha"
length = len(greeting)            # 11

# f-strings (formatted string literals)
name = "Alice"
message = f"Hello, {name}!"
```

### Booleans

Boolean values represent truth:

```python
is_valid = True
is_empty = False

# Boolean operations
result = True and False  # False
result = True or False   # True
result = not True        # False
```

## Type Checking and Conversion

```python
# Check type
x = 42
print(type(x))  # <class 'int'>

# Type conversion
num_str = "123"
num_int = int(num_str)    # 123
num_float = float(num_str) # 123.0
back_to_str = str(num_int) # "123"
```

## None Type

`None` represents the absence of a value:

```python
result = None

if result is None:
    print("No result yet")
```

## Collections Preview

Python has several built-in collection types:

```python
# List - ordered, mutable
fruits = ["apple", "banana", "cherry"]

# Tuple - ordered, immutable
point = (10, 20)

# Dictionary - key-value pairs
person = {"name": "Alice", "age": 30}

# Set - unordered, unique values
unique_numbers = {1, 2, 3, 3, 3}  # {1, 2, 3}
```

## Key Takeaways

1. Python uses dynamic typing — variables can hold any type
2. Core types: `int`, `float`, `str`, `bool`, `None`
3. Use `type()` to check a value's type
4. Collections include lists, tuples, dicts, and sets
5. f-strings provide convenient string formatting
