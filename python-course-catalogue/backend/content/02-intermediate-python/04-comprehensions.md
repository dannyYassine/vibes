---
title: "Comprehensions"
description: "Write concise and readable code with list, dict, and set comprehensions."
duration_minutes: 20
order: 4
---

## List Comprehensions

Transform and filter sequences in a single expression:

```python
# Basic syntax: [expression for item in iterable]
squares = [x**2 for x in range(10)]
# [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

# With condition: [expression for item in iterable if condition]
even_squares = [x**2 for x in range(10) if x % 2 == 0]
# [0, 4, 16, 36, 64]
```

### vs Traditional Loops

```python
# Traditional loop
squares = []
for x in range(10):
    squares.append(x**2)

# Comprehension (more Pythonic)
squares = [x**2 for x in range(10)]
```

### Complex Expressions

```python
# Calling functions
names = ["alice", "bob", "charlie"]
upper_names = [name.upper() for name in names]

# Conditional expression in output
labels = ["even" if x % 2 == 0 else "odd" for x in range(5)]
# ['even', 'odd', 'even', 'odd', 'even']

# Method chaining
words = ["  hello  ", "  world  "]
cleaned = [w.strip().title() for w in words]
# ['Hello', 'World']
```

## Nested Comprehensions

### Flattening Lists

```python
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]

# Flatten to 1D list
flat = [num for row in matrix for num in row]
# [1, 2, 3, 4, 5, 6, 7, 8, 9]

# Read as: for row in matrix, for num in row, yield num
```

### Creating Matrices

```python
# 3x3 matrix of zeros
matrix = [[0 for _ in range(3)] for _ in range(3)]

# Multiplication table
table = [[i*j for j in range(1, 6)] for i in range(1, 6)]
```

### Cartesian Product

```python
colors = ["red", "blue"]
sizes = ["S", "M", "L"]

combinations = [(c, s) for c in colors for s in sizes]
# [('red', 'S'), ('red', 'M'), ('red', 'L'),
#  ('blue', 'S'), ('blue', 'M'), ('blue', 'L')]
```

## Dictionary Comprehensions

Create dictionaries from iterables:

```python
# Basic syntax: {key: value for item in iterable}
squares = {x: x**2 for x in range(5)}
# {0: 0, 1: 1, 2: 4, 3: 9, 4: 16}

# From two lists
names = ["alice", "bob"]
ages = [30, 25]
people = {name: age for name, age in zip(names, ages)}
# {'alice': 30, 'bob': 25}

# Inverting a dictionary
original = {"a": 1, "b": 2, "c": 3}
inverted = {v: k for k, v in original.items()}
# {1: 'a', 2: 'b', 3: 'c'}
```

### Filtering Dictionaries

```python
prices = {"apple": 1.50, "banana": 0.75, "cherry": 3.00}

# Filter by value
expensive = {k: v for k, v in prices.items() if v > 1.00}
# {'apple': 1.50, 'cherry': 3.00}

# Transform keys
upper_prices = {k.upper(): v for k, v in prices.items()}
```

## Set Comprehensions

Create sets (unique values):

```python
# Basic syntax: {expression for item in iterable}
squares = {x**2 for x in range(-3, 4)}
# {0, 1, 4, 9}  (duplicates removed)

# From string
unique_chars = {c.lower() for c in "Hello World" if c.isalpha()}
# {'h', 'e', 'l', 'o', 'w', 'r', 'd'}
```

## Generator Expressions

Lazy evaluation with parentheses:

```python
# Generator expression (lazy)
squares_gen = (x**2 for x in range(1000000))

# Memory efficient - computes on demand
for sq in squares_gen:
    if sq > 100:
        print(sq)
        break

# Useful with functions that consume iterables
total = sum(x**2 for x in range(100))  # No extra list
```

## When to Use Comprehensions

### Good Uses

```python
# Simple transformations
doubled = [x * 2 for x in numbers]

# Filtering
adults = [p for p in people if p.age >= 18]

# Creating data structures
lookup = {item.id: item for item in items}
```

### When to Avoid

```python
# Too complex - use regular loop
# Bad:
result = [
    process(x)
    for x in items
    if validate(x) and check_permission(x)
    if x.category in allowed_categories
]

# Better:
result = []
for x in items:
    if not validate(x):
        continue
    if not check_permission(x):
        continue
    if x.category not in allowed_categories:
        continue
    result.append(process(x))

# Side effects - don't use comprehension
# Bad:
[print(x) for x in items]  # Creates useless list

# Good:
for x in items:
    print(x)
```

## Key Takeaways

1. List comprehensions: `[expr for x in iterable if cond]`
2. Dict comprehensions: `{k: v for x in iterable}`
3. Set comprehensions: `{expr for x in iterable}`
4. Generator expressions use `()` and are lazy
5. Keep comprehensions simple; use loops for complex logic
6. Avoid side effects in comprehensions
