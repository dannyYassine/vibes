---
title: "Sorting, Key Functions & Timsort"
description: "Master Python's sort with key functions, operator module, and stability guarantees."
duration_minutes: 20
order: 4
---

## Overview

Python's built-in sort is one of the most refined in any language — it is stable, adaptive, and consistently fast. Understanding how to use `key=`, the `operator` module, and sort stability gives you precise control over ordering. Knowing `heapq` and `bisect` extends that control to streaming and insertable sorted collections.

---

## list.sort() vs sorted()

These are the two built-in sort functions. Know when to use each:

```python
numbers = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3]

# list.sort() — sorts IN PLACE, returns None
numbers.sort()
print(numbers)   # [1, 1, 2, 3, 3, 4, 5, 5, 6, 9]

# Pitfall: assigning the result
result = numbers.sort()   # result is None! list.sort() returns None by design.
print(result)             # None — this is a common mistake

# sorted() — returns a NEW sorted list, original is unchanged
words = ["banana", "apple", "cherry", "date"]
sorted_words = sorted(words)
print(sorted_words)   # ['apple', 'banana', 'cherry', 'date']
print(words)          # ['banana', 'apple', 'cherry', 'date']  — untouched

# sorted() works on ANY iterable, not just lists
print(sorted({3, 1, 4, 1, 5}))    # [1, 3, 4, 5]  (set)
print(sorted("python"))            # ['h', 'n', 'o', 'p', 't', 'y']  (string)
print(sorted({"b": 2, "a": 1}))   # ['a', 'b']  (dict keys)
```

**Guideline**: use `sort()` when you own the list and want in-place mutation. Use `sorted()` when you need the original preserved, or when sorting a non-list iterable.

---

## The key= Parameter

The `key` function is called once on each element. Elements are sorted by their transformed values, not the originals.

```python
words = ["Banana", "apple", "Cherry", "date"]

# Default sort: case-sensitive ('B' < 'a' in ASCII)
print(sorted(words))
# ['Banana', 'Cherry', 'apple', 'date']  — uppercase before lowercase

# Case-insensitive: use str.lower as key
print(sorted(words, key=str.lower))
# ['apple', 'Banana', 'Cherry', 'date']

# Sort by string length
print(sorted(words, key=len))
# ['date', 'apple', 'Banana', 'Cherry']

# Sort by last character
print(sorted(words, key=lambda w: w[-1]))
# ['Banana', 'apple', 'date', 'Cherry']  (a, e, e, y)
```

---

## operator Module: Faster and Clearer Key Functions

The `operator` module provides key functions that are faster than equivalent lambdas (they are implemented in C) and more readable:

```python
from operator import itemgetter, attrgetter, methodcaller

# itemgetter — for sorting dicts, namedtuples, or any subscriptable type
people = [
    {"name": "Alice",  "age": 30, "dept": "Engineering"},
    {"name": "Bob",    "age": 25, "dept": "Marketing"},
    {"name": "Carol",  "age": 35, "dept": "Engineering"},
    {"name": "Dave",   "age": 25, "dept": "HR"},
]

# Sort by age (equivalent to lambda p: p["age"])
by_age = sorted(people, key=itemgetter("age"))
for p in by_age:
    print(f"{p['name']}: {p['age']}")

# itemgetter with multiple fields — returns a tuple, sorts lexicographically
by_dept_then_age = sorted(people, key=itemgetter("dept", "age"))
for p in by_dept_then_age:
    print(f"{p['dept']:15} {p['name']}")

# Sort a list of tuples by second element
coords = [(3, 5), (1, 8), (2, 3), (4, 1)]
by_y = sorted(coords, key=itemgetter(1))
print(by_y)   # [(4, 1), (2, 3), (3, 5), (1, 8)]
```

```python
# attrgetter — for sorting objects by attribute
from operator import attrgetter
from dataclasses import dataclass

@dataclass
class Employee:
    name: str
    salary: float
    department: str

employees = [
    Employee("Alice",  95000, "Engineering"),
    Employee("Bob",    75000, "Marketing"),
    Employee("Carol", 110000, "Engineering"),
    Employee("Dave",   75000, "HR"),
]

# Sort by salary
by_salary = sorted(employees, key=attrgetter("salary"))
for e in by_salary:
    print(f"{e.name}: ${e.salary:,}")

# Sort by department, then salary (multi-attribute)
by_dept_salary = sorted(employees, key=attrgetter("department", "salary"))
for e in by_dept_salary:
    print(f"{e.department:15} {e.name}: ${e.salary:,}")
```

```python
# methodcaller — call a method for the key
from operator import methodcaller

words = ["  banana  ", " apple ", "cherry  ", "  date"]
# Sort by stripped length
stripped_sort = sorted(words, key=methodcaller("strip"))
print(stripped_sort)
```

---

## reverse=True: Descending Sort

```python
numbers = [3, 1, 4, 1, 5, 9, 2, 6]
print(sorted(numbers, reverse=True))   # [9, 6, 5, 4, 3, 2, 1, 1]

# Descending by a key
people = [{"name": "Alice", "age": 30}, {"name": "Bob", "age": 25}]
oldest_first = sorted(people, key=lambda p: p["age"], reverse=True)
```

---

## Multi-Key Sorting

### Method 1: Return a Tuple from key=

The simplest way — Python compares tuples element by element:

```python
from operator import itemgetter

data = [
    ("Engineering", "Alice",  95000),
    ("Marketing",   "Bob",    75000),
    ("Engineering", "Carol", 110000),
    ("HR",          "Dave",   75000),
    ("Marketing",   "Eve",    80000),
]

# Sort by department, then by salary descending
# Negate salary for descending in a tuple key
sorted_data = sorted(data, key=lambda x: (x[0], -x[2]))
for row in sorted_data:
    print(row)
```

**Limitation**: negation works for numbers, but not for strings. For mixed ascending/descending on strings, use method 2.

### Method 2: Stable Sort Applied in Reverse Priority

Because sort is stable, you can apply multiple sorts in reverse order of priority:

```python
# Sort by salary descending, then by name ascending
# Step 1: sort by the lower-priority key (name ascending)
data.sort(key=itemgetter(1))
# Step 2: sort by the higher-priority key (salary descending)
data.sort(key=itemgetter(2), reverse=True)
# Equal salaries retain the name order from step 1
```

This "sort-sort" technique generalizes to any mixed ascending/descending combination.

---

## Sort Stability

Python's sort is **stable** — elements that compare equal maintain their original relative order.

```python
students = [
    ("Alice",   "A"),
    ("Bob",     "B"),
    ("Charlie", "A"),
    ("Diana",   "B"),
    ("Eve",     "A"),
]

# Sort by grade only
by_grade = sorted(students, key=lambda s: s[1])
print(by_grade)
# [('Alice', 'A'), ('Charlie', 'A'), ('Eve', 'A'), ('Bob', 'B'), ('Diana', 'B')]
# Within each grade, original order is preserved — that's stability
```

Stability is what makes the reverse-priority multi-sort technique work.

---

## Decorate-Sort-Undecorate (Schwartzian Transform)

When the key function is expensive to compute, precompute the keys once:

```python
import hashlib

words = ["banana", "apple", "cherry", "date", "elderberry"]

# Naive: hash is computed multiple times per element during sort
slow = sorted(words, key=lambda w: hashlib.sha256(w.encode()).hexdigest())

# DSU pattern: compute keys once, sort, strip keys
decorated   = [(hashlib.sha256(w.encode()).hexdigest(), w) for w in words]
decorated.sort()
undecorated = [w for _, w in decorated]
print(undecorated)
```

In Python's sort, the `key=` function is already called exactly once per element, so the DSU pattern is mostly historical. It matters when you need to share precomputed keys across multiple sorts.

---

## heapq — Priority Queues and Top-N

A heap is a tree structure that always gives you the smallest element in O(log n). Python's `heapq` uses a min-heap on a regular list.

```python
import heapq

# heappush / heappop
heap = []
heapq.heappush(heap, 5)
heapq.heappush(heap, 1)
heapq.heappush(heap, 3)
heapq.heappush(heap, 7)

print(heap)               # [1, 5, 3, 7]  (heap order, not sorted)
print(heapq.heappop(heap)) # 1  (smallest)
print(heapq.heappop(heap)) # 3

# heapify — convert an existing list into a heap in O(n)
data = [5, 8, 1, 3, 9, 2, 7]
heapq.heapify(data)
print(data[0])   # 1 — minimum is always at index 0

# nlargest and nsmallest — efficient for top-N from large data
numbers = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5]
print(heapq.nlargest(3, numbers))    # [9, 6, 5]
print(heapq.nsmallest(3, numbers))   # [1, 1, 2]

# With a key function
data = [{"name": "Alice", "score": 95}, {"name": "Bob", "score": 72},
        {"name": "Carol", "score": 88}]
top2 = heapq.nlargest(2, data, key=lambda x: x["score"])
print(top2)   # [{'name': 'Alice', 'score': 95}, {'name': 'Carol', 'score': 88}]
```

### When to Use heapq

- **Priority queue**: process tasks in priority order without sorting the whole list each time
- **Top-N from a large stream**: `nlargest(n, stream)` uses O(n) memory regardless of stream size, whereas `sorted(stream)[-n:]` buffers everything
- Rule of thumb: if N is much smaller than the total count, use `nlargest`/`nsmallest`; if N is close to the total, use `sorted()`

---

## bisect — Binary Search and Sorted Insertion

```python
import bisect

# Maintain a sorted list with efficient insertion
scores = [10, 20, 30, 40, 50]

# Find insertion point (O(log n))
pos = bisect.bisect_left(scores, 25)
print(pos)   # 2  — would insert before index 2

pos = bisect.bisect_right(scores, 30)
print(pos)   # 3  — would insert after existing 30

# Insert while keeping sorted (O(log n) search, O(n) insertion)
bisect.insort(scores, 25)
print(scores)   # [10, 20, 25, 30, 40, 50]

bisect.insort(scores, 30)
print(scores)   # [10, 20, 25, 30, 30, 40, 50]  — insort_right by default

# Grade lookup with bisect (efficient range lookup)
def letter_grade(score: int) -> str:
    breakpoints = [60, 70, 80, 90]
    grades      = ["F", "D", "C", "B", "A"]
    return grades[bisect.bisect(breakpoints, score)]

print(letter_grade(55))   # F
print(letter_grade(73))   # C
print(letter_grade(91))   # A
```

**`bisect_left` vs `bisect_right`**: when the value is already in the list, `bisect_left` returns the position before existing equal elements, `bisect_right` returns the position after.

---

## Timsort: Why It Is Fast

Python's sort algorithm is **Timsort**, designed by Tim Peters. Key properties:

- **Stable**: equal elements preserve original order
- **Adaptive**: exploits pre-existing order in the input
- **O(n log n)** worst case, **O(n)** best case (already sorted input)
- **In-place for lists** (constant extra memory for small sizes, O(log n) for the merge stack)

**How it works**:
1. Scan the list for natural *runs* — already-sorted subsequences
2. Short runs are extended with insertion sort (fast for small n)
3. Runs are merged using an optimized merge sort that leverages the existing order

```python
import time

# Already-sorted list — Timsort is O(n)
sorted_list   = list(range(1_000_000))
reversed_list = sorted_list[::-1]
random_list   = sorted_list.copy()

import random
random.shuffle(random_list)

def time_sort(lst):
    start = time.perf_counter()
    sorted(lst)
    return time.perf_counter() - start

print(f"Already sorted:   {time_sort(sorted_list):.4f}s")
print(f"Reverse sorted:   {time_sort(reversed_list):.4f}s")
print(f"Random:           {time_sort(random_list):.4f}s")
# Already sorted will be dramatically faster
```

---

## Sorting Custom Objects

### Using __lt__

```python
class Task:
    def __init__(self, priority: int, name: str):
        self.priority = priority
        self.name     = name

    def __lt__(self, other):
        return self.priority < other.priority

    def __repr__(self):
        return f"Task({self.priority}, {self.name!r})"

tasks = [Task(3, "low"), Task(1, "urgent"), Task(2, "normal")]
print(sorted(tasks))   # [Task(1, 'urgent'), Task(2, 'normal'), Task(3, 'low')]
```

### Using total_ordering with @dataclass

```python
from dataclasses import dataclass, field
from functools import total_ordering

@total_ordering
@dataclass
class Version:
    major: int
    minor: int
    patch: int

    def __eq__(self, other):
        return (self.major, self.minor, self.patch) == (other.major, other.minor, other.patch)

    def __lt__(self, other):
        return (self.major, self.minor, self.patch) < (other.major, other.minor, other.patch)

versions = [Version(1, 10, 0), Version(2, 0, 1), Version(1, 9, 5)]
print(sorted(versions))
# [Version(major=1, minor=9, patch=5), Version(major=1, minor=10, patch=0), Version(major=2, minor=0, patch=1)]
```

---

## Key Takeaways

- **`list.sort()`** sorts in place and returns `None`. **`sorted()`** returns a new sorted list and works on any iterable. Never assign `x = list.sort()`.
- **`key=`** is called once per element. It takes any callable — `str.lower`, `len`, `lambda`, or `operator.itemgetter`.
- **`operator.itemgetter`** and **`operator.attrgetter`** are faster than equivalent lambdas and more readable for structured data.
- **Sort stability** guarantees equal elements keep their original order. This is what makes reverse-priority multi-sorting work.
- **Multi-key sorting**: return a tuple from `key=` (negate numeric fields for descending), or apply stable sorts in reverse-priority order.
- **`heapq.nlargest(n, iterable)`** is the efficient way to get the top N items from a large or streaming dataset. It uses O(n) memory.
- **`bisect`** provides O(log n) binary search and sorted insertion. Ideal for grade lookups, range queries, and maintaining sorted order with frequent insertions.
- **Timsort** is adaptive — pre-sorted data sorts in O(n). For large lists that are already partially ordered, Python's sort is especially fast.
