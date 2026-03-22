---
title: "Lists, Tuples, and Sets"
description: "Understand Python's sequence and set types, their differences, and when to use each."
duration_minutes: 30
order: 8
---

## Lists, Tuples, and Sets

Python provides several built-in collection types. Understanding their differences — mutability, ordering, hashability, and performance — lets you pick the right tool for every situation.

---

## Lists

A list is a **mutable, ordered sequence** that can hold any mix of types. It is the go-to general-purpose container.

### Creation and Indexing

```python
# Creation
empty = []
numbers = [1, 2, 3, 4, 5]
mixed   = [42, "hello", 3.14, True, None]
nested  = [[1, 2], [3, 4], [5, 6]]

# From other iterables
from_range  = list(range(1, 11))       # [1, 2, ..., 10]
from_string = list("hello")            # ['h', 'e', 'l', 'l', 'o']
from_tuple  = list((1, 2, 3))          # [1, 2, 3]

# Indexing (0-based, negative counts from end)
fruits = ["apple", "banana", "cherry", "date", "elderberry"]
print(fruits[0])    # apple
print(fruits[-1])   # elderberry
print(fruits[-2])   # date
```

### Slicing

Slicing syntax: `list[start:stop:step]`. Start is inclusive, stop is exclusive.

```python
nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

print(nums[2:5])     # [2, 3, 4]
print(nums[:4])      # [0, 1, 2, 3]     — start defaults to 0
print(nums[6:])      # [6, 7, 8, 9]     — stop defaults to end
print(nums[-3:])     # [7, 8, 9]        — last 3 elements
print(nums[::2])     # [0, 2, 4, 6, 8]  — every second element
print(nums[1::2])    # [1, 3, 5, 7, 9]  — every second, starting at 1
print(nums[::-1])    # [9, 8, 7, ..., 0] — reversed

# Shallow copy via slice
copy = nums[:]
copy.append(99)
print(nums[-1])   # 9   — original untouched

# Slice assignment (mutates in place)
nums[2:5] = [20, 30, 40]
print(nums)  # [0, 1, 20, 30, 40, 5, 6, 7, 8, 9]

nums[2:5] = []  # delete a slice
print(nums)     # [0, 1, 5, 6, 7, 8, 9]
```

### Mutation Methods

```python
lst = [3, 1, 4, 1, 5, 9]

# append vs extend
lst.append(2)           # adds one element: [3, 1, 4, 1, 5, 9, 2]
lst.extend([6, 5, 3])   # adds all elements from iterable
lst.extend(range(3))    # [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 0, 1, 2]

# Common mistake: append a list instead of extend
a = [1, 2, 3]
a.append([4, 5])   # [[4, 5]] nested!  a = [1, 2, 3, [4, 5]]
a = [1, 2, 3]
a.extend([4, 5])   # a = [1, 2, 3, 4, 5]  — correct

# insert(index, value)
lst = ["a", "b", "d"]
lst.insert(2, "c")       # insert at index 2
print(lst)               # ['a', 'b', 'c', 'd']
lst.insert(0, "first")   # insert at start
lst.insert(-1, "second-to-last")

# remove(value) — removes first occurrence, raises ValueError if not found
lst = [1, 2, 3, 2, 4]
lst.remove(2)
print(lst)  # [1, 3, 2, 4]

# pop(index=-1) — removes and returns element
lst = [10, 20, 30, 40]
last = lst.pop()      # 40  (removes last)
first = lst.pop(0)    # 10  (removes first — O(n) shift!)
print(lst)            # [20, 30]

# sort() — in-place sort (returns None!)
numbers = [3, 1, 4, 1, 5, 9, 2, 6]
numbers.sort()
print(numbers)   # [1, 1, 2, 3, 4, 5, 6, 9]

numbers.sort(reverse=True)
print(numbers)   # [9, 6, 5, 4, 3, 2, 1, 1]

# sort with key function
words = ["banana", "Apple", "cherry", "date"]
words.sort(key=str.lower)    # case-insensitive sort
print(words)  # ['Apple', 'banana', 'cherry', 'date']

people = [("Alice", 30), ("Bob", 25), ("Charlie", 35)]
people.sort(key=lambda p: p[1])  # sort by age
print(people)  # [('Bob', 25), ('Alice', 30), ('Charlie', 35)]

# reverse() — in-place reversal
lst = [1, 2, 3, 4]
lst.reverse()
print(lst)  # [4, 3, 2, 1]

# index(value) — raises ValueError if not found
lst = ["a", "b", "c", "b"]
print(lst.index("b"))     # 1 (first occurrence)
print(lst.index("b", 2))  # 3 (search from index 2)

# count(value)
print(lst.count("b"))   # 2

# clear and del
lst = [1, 2, 3]
lst.clear()    # []
del lst[:]     # equivalent
```

### List Comprehensions

```python
# [expression for item in iterable if condition]

squares = [x**2 for x in range(10)]
evens   = [x for x in range(20) if x % 2 == 0]

# With transformation
names = ["  alice ", "BOB", "  Charlie  "]
clean = [n.strip().title() for n in names]
print(clean)  # ['Alice', 'Bob', 'Charlie']

# Nested comprehension
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flat   = [val for row in matrix for val in row]
print(flat)   # [1, 2, 3, 4, 5, 6, 7, 8, 9]

# Flatten and filter in one go
data = [[1, -2, 3], [-4, 5, -6], [7, 8, -9]]
positive = [x for row in data for x in row if x > 0]
print(positive)  # [1, 3, 5, 7, 8]
```

---

## Tuples

A tuple is an **immutable, ordered sequence**. It is defined with parentheses (or just commas).

### Creation and Immutability

```python
# Creation
empty   = ()
single  = (42,)       # NOTE the comma — without it, (42) is just 42
pair    = (1, 2)
triple  = (1, 2, 3)
no_parens = 1, 2, 3   # also a tuple

t = (10, 20, 30)
print(t[0])    # 10
print(t[-1])   # 30
print(t[1:])   # (20, 30)

# t[0] = 99    # TypeError: 'tuple' object does not support item assignment

# But contained mutable objects CAN be mutated
t2 = ([1, 2], [3, 4])
t2[0].append(99)
print(t2)   # ([1, 2, 99], [3, 4])
```

### Packing and Unpacking

```python
# Packing
coords = 10, 20, 30

# Unpacking — must match exactly
x, y, z = coords
print(x, y, z)   # 10 20 30

# Star unpacking
first, *middle, last = [1, 2, 3, 4, 5]
print(first)   # 1
print(middle)  # [2, 3, 4]
print(last)    # 5

# Swap without a temp variable
a, b = 1, 2
a, b = b, a
print(a, b)  # 2 1

# Function returning multiple values (really a tuple)
def min_max(seq):
    return min(seq), max(seq)

lo, hi = min_max([3, 1, 4, 1, 5, 9])
print(lo, hi)  # 1 9

# Ignore values with _
_, y_coord, _ = (10, 20, 30)
print(y_coord)  # 20
```

### Tuples as Dictionary Keys

Because tuples are hashable (if all elements are hashable), they can serve as dict keys — lists cannot.

```python
locations = {
    (40.7128, -74.0060): "New York",
    (51.5074, -0.1278):  "London",
    (35.6762, 139.6503): "Tokyo",
}
print(locations[(40.7128, -74.0060)])  # New York

# Grid coordinates
grid = {}
for row in range(3):
    for col in range(3):
        grid[(row, col)] = row * 3 + col

print(grid[(1, 2)])   # 5
```

### namedtuple Preview

`collections.namedtuple` gives tuple fields readable names without the full overhead of a class:

```python
from collections import namedtuple

Point = namedtuple("Point", ["x", "y"])
p = Point(3, 4)
print(p.x, p.y)    # 3 4
print(p[0], p[1])  # 3 4  — still indexable
print(p)           # Point(x=3, y=4)  — readable repr

# Immutable — cannot assign
# p.x = 10   # AttributeError
```

---

## Sets

A set is an **unordered collection of unique, hashable elements**. Python sets implement mathematical set operations.

### Creation

```python
# Set literal — note: {} alone creates a dict, NOT a set
s = {1, 2, 3, 4, 5}
print(type(s))       # <class 'set'>

empty_set = set()    # NOT {} which is an empty dict!

# From iterable — automatically deduplicates
from_list = set([1, 2, 2, 3, 3, 3])
print(from_list)  # {1, 2, 3}

# Fast deduplication while preserving order (Python 3.7+)
data = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]
unique_ordered = list(dict.fromkeys(data))
print(unique_ordered)   # [3, 1, 4, 5, 9, 2, 6]
```

### Mutation Methods

```python
s = {1, 2, 3}

# add — O(1) average
s.add(4)
s.add(2)  # no-op if already present
print(s)  # {1, 2, 3, 4}

# remove — raises KeyError if not found
s.remove(3)

# discard — safe remove, no error if not found
s.discard(99)   # silently does nothing
s.discard(2)

# pop — removes and returns an ARBITRARY element
val = s.pop()
print(val)   # could be anything

# clear
s.clear()
print(s)  # set()
```

### Set Operations

```python
a = {1, 2, 3, 4, 5}
b = {3, 4, 5, 6, 7}

# Union: all elements in a OR b
print(a | b)           # {1, 2, 3, 4, 5, 6, 7}
print(a.union(b))

# Intersection: elements in BOTH
print(a & b)           # {3, 4, 5}
print(a.intersection(b))

# Difference: in a but NOT in b
print(a - b)           # {1, 2}
print(a.difference(b))

# Symmetric difference: in one but NOT both
print(a ^ b)                        # {1, 2, 6, 7}
print(a.symmetric_difference(b))

# Subset / superset
small = {3, 4}
print(small <= a)          # True  — issubset
print(small.issubset(a))
print(a >= small)          # True  — issuperset
print(small < a)           # True  — proper subset (not equal)

# Disjoint — no common elements
print({1, 2}.isdisjoint({3, 4}))   # True
print({1, 2}.isdisjoint({2, 3}))   # False

# In-place operations
a |= {8, 9}   # a = a.union({8, 9})
a &= b        # a = a.intersection(b)
a -= b        # a = a.difference(b)
```

### frozenset

`frozenset` is the immutable, hashable variant. Can be used as a dict key or set element.

```python
fs = frozenset([1, 2, 3])
print(fs)           # frozenset({1, 2, 3})

# Can be used as dict key
tags_index = {
    frozenset(["python", "backend"]): ["article1", "article3"],
    frozenset(["python", "ml"]):      ["article2"],
}

# Can be an element of a set
set_of_sets = {frozenset({1, 2}), frozenset({3, 4})}
```

### Set Comprehensions

```python
# {expression for item in iterable if condition}

squares = {x**2 for x in range(-5, 6)}
print(squares)   # {0, 1, 4, 9, 16, 25}  — duplicates removed

# Extract unique domains from emails
emails = ["alice@example.com", "bob@example.com", "charlie@other.org"]
domains = {email.split("@")[1] for email in emails}
print(domains)   # {'example.com', 'other.org'}
```

---

## Performance: list O(n) vs set O(1) for Membership

This is one of the most important performance choices in Python.

```python
import time
import random

data = list(range(1_000_000))
data_set = set(data)

# Searching a list: O(n) — scans every element until found
targets = [random.randint(0, 1_000_000) for _ in range(1000)]

start = time.perf_counter()
for t in targets:
    _ = t in data          # worst case: scans 1 million elements
list_time = time.perf_counter() - start

# Searching a set: O(1) average — hash lookup
start = time.perf_counter()
for t in targets:
    _ = t in data_set      # hash computed, bucket found immediately
set_time = time.perf_counter() - start

print(f"List: {list_time:.4f}s")
print(f"Set:  {set_time:.6f}s")
print(f"Speedup: {list_time / set_time:.0f}x")
# Speedup: ~200-1000x depending on hardware

# Convert when you'll do many membership checks
def filter_allowed(items: list, allowed: list) -> list:
    # BAD: O(n*m) — checks each item against entire allowed list
    return [x for x in items if x in allowed]

def filter_allowed_fast(items: list, allowed: list) -> list:
    # GOOD: O(n) — convert allowed to set once, then O(1) lookups
    allowed_set = set(allowed)
    return [x for x in items if x in allowed_set]
```

---

## Choosing the Right Type

| Need | Use |
|------|-----|
| Ordered, mutable sequence | `list` |
| Ordered, immutable record | `tuple` |
| Hashable key from multiple values | `tuple` |
| Unique elements, fast membership | `set` |
| Immutable unique collection / dict key | `frozenset` |
| Named tuple fields | `collections.namedtuple` or `dataclass` |

---

## Key Takeaways

- **Lists** are your mutable workhorse. Use `append` for single items, `extend` for many. Slicing with `[:]` creates a shallow copy.
- **`pop(0)` on a list is O(n)**. Use `collections.deque` if you need efficient removal from the left end.
- **Tuples** signal "this data is fixed". Use them for multi-field keys, function return values, and anywhere immutability is desired.
- A **single-element tuple** requires a trailing comma: `(42,)` — not `(42)`.
- **Sets** excel at membership testing (`in`) and deduplication. Both are O(1) average vs O(n) for lists.
- Use `set()` (not `{}`) for an empty set — `{}` creates an empty dict.
- **frozenset** is to set what tuple is to list: immutable and hashable.
- When writing a loop that checks `if x in collection` many times, convert `collection` to a `set` first.
