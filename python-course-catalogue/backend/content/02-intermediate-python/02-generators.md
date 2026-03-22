---
title: "Generators and Iterators"
description: "Create memory-efficient sequences with generators and understand Python's iteration protocol."
duration_minutes: 25
order: 2
---

## The Iterator Protocol

Python's `for` loop works with any **iterable** — an object that implements `__iter__()`:

```python
class CountUp:
    def __init__(self, limit):
        self.limit = limit
        self.current = 0

    def __iter__(self):
        return self

    def __next__(self):
        if self.current >= self.limit:
            raise StopIteration
        self.current += 1
        return self.current

# Using the iterator
for num in CountUp(5):
    print(num)  # 1, 2, 3, 4, 5
```

## Generators: A Simpler Way

Generators are functions that use `yield` instead of `return`:

```python
def count_up(limit):
    current = 1
    while current <= limit:
        yield current
        current += 1

# Using the generator
for num in count_up(5):
    print(num)  # 1, 2, 3, 4, 5

# Generators are iterators
gen = count_up(3)
print(next(gen))  # 1
print(next(gen))  # 2
print(next(gen))  # 3
print(next(gen))  # StopIteration
```

## Why Use Generators?

### Memory Efficiency

Generators produce values on-demand instead of storing everything in memory:

```python
# List - stores all values in memory
def get_squares_list(n):
    return [x**2 for x in range(n)]

# Generator - yields one value at a time
def get_squares_gen(n):
    for x in range(n):
        yield x**2

# For large n, the generator uses constant memory
# The list uses O(n) memory
```

### Processing Large Files

```python
def read_large_file(path):
    with open(path) as f:
        for line in f:
            yield line.strip()

# Process line by line without loading entire file
for line in read_large_file("huge_file.txt"):
    process(line)
```

## Generator Expressions

Like list comprehensions, but lazy:

```python
# List comprehension (eager)
squares_list = [x**2 for x in range(1000000)]

# Generator expression (lazy)
squares_gen = (x**2 for x in range(1000000))

# Generator uses almost no memory until iterated
for sq in squares_gen:
    if sq > 100:
        print(sq)
        break
```

## yield from

Delegate to another generator:

```python
def flatten(nested_list):
    for item in nested_list:
        if isinstance(item, list):
            yield from flatten(item)  # Recursively yield
        else:
            yield item

nested = [1, [2, 3, [4, 5]], 6]
print(list(flatten(nested)))  # [1, 2, 3, 4, 5, 6]
```

## Two-Way Communication with Generators

Generators can receive values via `send()`:

```python
def running_average():
    total = 0
    count = 0
    average = None
    while True:
        value = yield average
        total += value
        count += 1
        average = total / count

avg = running_average()
next(avg)  # Prime the generator
print(avg.send(10))  # 10.0
print(avg.send(20))  # 15.0
print(avg.send(30))  # 20.0
```

## Useful itertools Functions

The `itertools` module provides powerful iteration tools:

```python
from itertools import (
    count, cycle, repeat,
    chain, islice,
    takewhile, dropwhile,
    groupby, combinations, permutations
)

# Infinite iterators
for i in islice(count(10), 5):
    print(i)  # 10, 11, 12, 13, 14

# Chain multiple iterables
for item in chain([1, 2], [3, 4]):
    print(item)  # 1, 2, 3, 4

# Take while condition is true
nums = [1, 3, 5, 8, 2, 4]
print(list(takewhile(lambda x: x < 6, nums)))  # [1, 3, 5]

# Group consecutive elements
data = "AAABBCCCC"
for key, group in groupby(data):
    print(key, list(group))
# A ['A', 'A', 'A']
# B ['B', 'B']
# C ['C', 'C', 'C', 'C']

# Combinations and permutations
print(list(combinations('ABC', 2)))
# [('A', 'B'), ('A', 'C'), ('B', 'C')]
```

## Generator-Based Pipelines

Chain generators for efficient data processing:

```python
def read_lines(path):
    with open(path) as f:
        for line in f:
            yield line

def parse_json_lines(lines):
    import json
    for line in lines:
        yield json.loads(line)

def filter_active(records):
    for record in records:
        if record.get('active'):
            yield record

# Pipeline: read -> parse -> filter
# Each step processes one item at a time
lines = read_lines("data.jsonl")
records = parse_json_lines(lines)
active = filter_active(records)

for record in active:
    process(record)
```

## Key Takeaways

1. Generators use `yield` to produce values lazily
2. They're memory-efficient for large datasets
3. Generator expressions are like lazy list comprehensions
4. `yield from` delegates to another generator
5. `send()` enables two-way communication
6. `itertools` provides powerful iteration utilities
