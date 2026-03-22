---
title: "Control Flow"
description: "Master conditional statements and loops in Python."
duration_minutes: 25
order: 2
---

## Conditional Statements

### if, elif, else

Python uses indentation to define code blocks:

```python
age = 18

if age < 13:
    print("Child")
elif age < 20:
    print("Teenager")
else:
    print("Adult")
```

### Comparison Operators

```python
x = 10
y = 20

x == y   # Equal to
x != y   # Not equal to
x < y    # Less than
x > y    # Greater than
x <= y   # Less than or equal
x >= y   # Greater than or equal
```

### Logical Operators

```python
age = 25
has_license = True

if age >= 18 and has_license:
    print("Can drive")

if age < 18 or not has_license:
    print("Cannot drive")
```

### Truthiness

Python evaluates these as `False`:
- `False`, `None`, `0`, `0.0`
- Empty sequences: `""`, `[]`, `()`, `{}`

```python
items = []
if not items:
    print("List is empty")

name = "Alice"
if name:
    print(f"Hello, {name}")
```

## Loops

### for Loops

Iterate over sequences:

```python
# List iteration
fruits = ["apple", "banana", "cherry"]
for fruit in fruits:
    print(fruit)

# Range iteration
for i in range(5):        # 0, 1, 2, 3, 4
    print(i)

for i in range(2, 6):     # 2, 3, 4, 5
    print(i)

for i in range(0, 10, 2): # 0, 2, 4, 6, 8
    print(i)

# Enumerate for index + value
for index, fruit in enumerate(fruits):
    print(f"{index}: {fruit}")

# Dictionary iteration
person = {"name": "Alice", "age": 30}
for key, value in person.items():
    print(f"{key}: {value}")
```

### while Loops

Execute while condition is true:

```python
count = 0
while count < 5:
    print(count)
    count += 1

# With break
while True:
    user_input = input("Enter 'quit' to exit: ")
    if user_input == "quit":
        break
```

### Loop Control

```python
# break - exit the loop
for i in range(10):
    if i == 5:
        break
    print(i)  # 0, 1, 2, 3, 4

# continue - skip to next iteration
for i in range(5):
    if i == 2:
        continue
    print(i)  # 0, 1, 3, 4

# else clause - runs if loop completes without break
for i in range(5):
    if i == 10:
        break
else:
    print("Loop completed normally")
```

## Match Statements (Python 3.10+)

Structural pattern matching:

```python
def http_status(status):
    match status:
        case 200:
            return "OK"
        case 404:
            return "Not Found"
        case 500:
            return "Internal Server Error"
        case _:
            return "Unknown"

# Pattern matching with guards
def categorize(value):
    match value:
        case int() if value < 0:
            return "negative integer"
        case int():
            return "positive integer"
        case str():
            return "string"
        case _:
            return "other"
```

## Ternary Expressions

Inline conditional:

```python
age = 20
status = "adult" if age >= 18 else "minor"

# Nested (use sparingly)
grade = "A" if score >= 90 else "B" if score >= 80 else "C"
```

## Key Takeaways

1. Use `if`/`elif`/`else` for branching logic
2. `for` loops iterate over sequences; `while` loops run until condition is false
3. `break` exits loops; `continue` skips to next iteration
4. Empty collections and `None` are falsy
5. Match statements provide powerful pattern matching (3.10+)
