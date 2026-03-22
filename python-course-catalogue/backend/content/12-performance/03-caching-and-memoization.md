---
title: "Caching: lru_cache, functools.cache & Redis"
description: "Speed up applications with in-process caching and distributed caching strategies."
duration_minutes: 25
order: 3
---

## Why Cache?

The core idea behind caching is simple: expensive work that produces the same result for the same inputs should only be done once. Subsequent requests use the stored result.

Common candidates for caching:
- **Heavy computation**: parsing a large file, running a machine learning inference, computing a report
- **Database queries**: fetching the same rows repeatedly (e.g., user permissions on every request)
- **External HTTP calls**: fetching a stock price, a geocoded address, or a weather forecast
- **Disk reads**: reading a configuration file on every function call

The trade-off is memory: you are exchanging RAM for speed. Every caching decision must weigh how much memory it will consume, how often the underlying data changes, and what happens if the cache serves stale data.

---

## Memoization

Memoization is a specific form of caching: the results of a function call are stored, keyed by the function's arguments. On subsequent calls with the same arguments, the stored result is returned immediately without executing the function body.

```python
# Manual memoization — to understand the concept
def make_memoized(func):
    cache = {}
    def wrapper(*args):
        if args not in cache:
            cache[args] = func(*args)
        return cache[args]
    return wrapper

@make_memoized
def expensive_computation(n):
    print(f"Computing for {n}...")
    return sum(i**2 for i in range(n))

expensive_computation(1000)  # Prints "Computing for 1000..."
expensive_computation(1000)  # Returns instantly, no print
expensive_computation(500)   # Prints "Computing for 500..."
```

Python provides this as a built-in through `functools`.

---

## functools.lru_cache

`lru_cache` (Least Recently Used cache) wraps any function and stores results in a cache with a maximum size. When the cache is full, the least recently used entry is evicted.

```python
from functools import lru_cache
import time

@lru_cache(maxsize=128)
def fetch_user_permissions(user_id: int) -> frozenset:
    """Simulates a slow DB call."""
    print(f"  [DB] Loading permissions for user {user_id}")
    time.sleep(0.1)  # Simulate 100ms DB call
    return frozenset(['read', 'write'])

# First call: hits the DB
perms = fetch_user_permissions(42)   # [DB] Loading permissions...

# Second call with same args: returns from cache instantly
perms = fetch_user_permissions(42)   # No print — cache hit!

# Different arg: new DB call
perms = fetch_user_permissions(99)   # [DB] Loading permissions...
```

### Cache Statistics

```python
@lru_cache(maxsize=256)
def compute(n):
    return n ** 2

for i in range(100):
    compute(i % 10)  # Only 10 unique values

info = compute.cache_info()
print(info)
# CacheInfo(hits=90, misses=10, maxsize=256, currsize=10)
# 90 hits (returned from cache), 10 misses (actually computed)
```

### maxsize=None: Unbounded Cache

```python
@lru_cache(maxsize=None)
def fibonacci(n):
    if n < 2:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

# With maxsize=None, every unique input is cached forever
# Memory grows without bound — only use when input space is finite and known
print(fibonacci(50))  # 12586269025 — computed in microseconds
```

### typed=True: Separate Cache Entries by Type

```python
@lru_cache(maxsize=128, typed=True)
def square(x):
    print(f"  Computing square({x!r})")
    return x * x

square(3)    # Computes: int 3
square(3)    # Cache hit
square(3.0)  # Computes: float 3.0 — different type, different cache entry
square(3.0)  # Cache hit
```

### Invalidating the Cache

```python
@lru_cache(maxsize=128)
def get_config(key: str) -> str:
    return load_from_disk(key)

# Force full cache clear (e.g., after config file changes)
get_config.cache_clear()

# After clearing, the next call reloads from disk
value = get_config('database_url')  # Cache miss, re-reads from disk
```

### Pitfall: lru_cache Requires Hashable Arguments

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def process(data):
    return sum(data)

process((1, 2, 3))   # OK — tuple is hashable
process([1, 2, 3])   # TypeError: unhashable type: 'list'

# Workaround: convert the list to a tuple at the call site
process(tuple(my_list))

# Or use a different approach for dict/list inputs:
import json

@lru_cache(maxsize=128)
def process_json(data_json: str):
    data = json.loads(data_json)
    return sum(data)

process_json(json.dumps([1, 2, 3]))
```

---

## functools.cache (Python 3.9+)

`functools.cache` is simply `lru_cache(maxsize=None)` with a cleaner spelling. It is unbounded and slightly faster than `lru_cache` because it skips the eviction bookkeeping.

```python
from functools import cache

@cache
def factorial(n: int) -> int:
    return 1 if n == 0 else n * factorial(n - 1)

print(factorial(10))  # 3628800
print(factorial.cache_info())  # CacheInfo(hits=9, misses=11, ...)
```

Use `cache` when the input space is small and bounded. Use `lru_cache(maxsize=N)` when you need to cap memory usage.

---

## functools.cached_property

For class-level properties that are expensive to compute and don't change after first access, `cached_property` computes the value once and stores it directly on the instance.

```python
from functools import cached_property
import math
import statistics

class DataSet:
    def __init__(self, data: list[float]):
        self._data = data

    @cached_property
    def mean(self) -> float:
        print("  Computing mean...")
        return statistics.mean(self._data)

    @cached_property
    def std_dev(self) -> float:
        print("  Computing std_dev...")
        return statistics.stdev(self._data)

    @cached_property
    def normalized(self) -> list[float]:
        print("  Normalizing...")
        m, s = self.mean, self.std_dev
        return [(x - m) / s for x in self._data]

data = DataSet([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

print(data.mean)       # Computing mean... → 5.5
print(data.mean)       # (no print — already stored on instance)
print(data.std_dev)    # Computing std_dev... → 3.028...
print(data.normalized) # Computing normalizing... → [...]
print(data.normalized) # (no print)
```

Unlike `lru_cache`, `cached_property` stores results as instance attributes — you can invalidate by deleting: `del obj.mean`. It also supports instances that hold mutable state, because the cache is per-instance not shared.

---

## Manual TTL Cache

`lru_cache` never expires entries based on time. For data that becomes stale (e.g., an exchange rate, a feature flag, a session token), you need Time-To-Live (TTL) eviction.

```python
import time
from typing import Any

class TTLCache:
    """Simple time-based cache with per-entry expiry."""

    def __init__(self, ttl_seconds: float):
        self.ttl = ttl_seconds
        self._cache: dict[Any, tuple[Any, float]] = {}  # key → (value, expires_at)

    def get(self, key) -> tuple[bool, Any]:
        entry = self._cache.get(key)
        if entry is None:
            return False, None
        value, expires_at = entry
        if time.monotonic() > expires_at:
            del self._cache[key]
            return False, None
        return True, value

    def set(self, key, value) -> None:
        self._cache[key] = (value, time.monotonic() + self.ttl)

# Usage
cache = TTLCache(ttl_seconds=60)

def get_exchange_rate(currency: str) -> float:
    found, value = cache.get(currency)
    if found:
        return value
    # Expensive API call
    rate = call_exchange_rate_api(currency)
    cache.set(currency, rate)
    return rate
```

---

## cachetools: A Full-Featured Caching Library

```bash
pip install cachetools
```

```python
from cachetools import TTLCache, LRUCache, LFUCache, cached
from cachetools.keys import hashkey

# TTLCache: items expire after 'ttl' seconds, max 'maxsize' items
ttl_cache = TTLCache(maxsize=100, ttl=300)  # 5 minutes

# LRUCache: evicts least recently used
lru_cache = LRUCache(maxsize=500)

# LFUCache: evicts least frequently used
lfu_cache = LFUCache(maxsize=200)

# Use as a decorator with the @cached decorator from cachetools
from cachetools import cached

@cached(cache=TTLCache(maxsize=128, ttl=60))
def get_user(user_id: int) -> dict:
    return db.fetch_user(user_id)

# Custom key function (useful when not all args should be part of the key)
@cached(
    cache=LRUCache(maxsize=256),
    key=lambda user_id, include_sensitive=False: hashkey(user_id)
    # Caches by user_id only, ignoring include_sensitive
)
def get_user_profile(user_id: int, include_sensitive: bool = False) -> dict:
    return db.fetch_profile(user_id, include_sensitive)
```

---

## Cache Patterns

### Cache-Aside (Lazy Population)

The most common pattern. The application is responsible for managing the cache:

```python
def get_product(product_id: int) -> dict:
    # 1. Check cache
    cached = cache.get(f"product:{product_id}")
    if cached:
        return cached

    # 2. On miss: load from DB
    product = db.query("SELECT * FROM products WHERE id=?", product_id)

    # 3. Store in cache for next time
    cache.set(f"product:{product_id}", product, ttl=300)
    return product
```

### Write-Through

On writes, update both the cache and the backing store together:

```python
def update_product(product_id: int, data: dict) -> None:
    # 1. Update DB
    db.execute("UPDATE products SET ... WHERE id=?", product_id)

    # 2. Update cache simultaneously (no stale data window)
    cache.set(f"product:{product_id}", data, ttl=300)
```

### TTL vs LRU Eviction

| Strategy | When an entry is evicted |
|---|---|
| **TTL** | After a fixed time period, regardless of usage |
| **LRU** | When cache is full, the least recently accessed entry is removed |
| **LFU** | When cache is full, the least frequently accessed entry is removed |

Use TTL when data has a known staleness window (exchange rates, weather). Use LRU/LFU when data doesn't expire but memory is limited (user profiles, rendered templates).

---

## Redis for Distributed Caching

In-process caches (`lru_cache`, `cachetools`) live in a single process's memory. If you run multiple workers (e.g., 4 Gunicorn workers, or pods in Kubernetes), each worker has its own cache — they don't share. For shared caching across processes or machines, use Redis.

```bash
pip install redis
```

```python
import redis
import json
import time

# Connect to Redis
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

def get_user_profile(user_id: int) -> dict:
    key = f"user:profile:{user_id}"

    # Try the cache first
    cached = r.get(key)
    if cached:
        return json.loads(cached)

    # Cache miss — load from DB
    profile = db.fetch_user_profile(user_id)

    # Store in Redis with 5-minute expiry
    r.set(key, json.dumps(profile), ex=300)  # ex= is TTL in seconds
    return profile

def invalidate_user_profile(user_id: int) -> None:
    """Call this when a user's profile is updated."""
    r.delete(f"user:profile:{user_id}")
```

### Redis Data Structures

Redis is not just a key-value store — it has rich data types:

```python
# Strings (most common for caching serialized objects)
r.set("key", "value", ex=60)
r.get("key")

# Hashes (for structured objects without serialization)
r.hset("user:42", mapping={"name": "Alice", "email": "alice@example.com"})
r.hget("user:42", "name")          # "Alice"
r.hgetall("user:42")               # {"name": "Alice", "email": "..."}

# Sets (membership testing, tags)
r.sadd("active_users", 42, 99, 101)
r.sismember("active_users", 42)    # True
r.smembers("active_users")         # {42, 99, 101}

# Sorted Sets (leaderboards, rate limiting)
r.zadd("leaderboard", {"alice": 1500, "bob": 1200})
r.zrange("leaderboard", 0, -1, withscores=True, rev=True)  # Top scores

# Lists (queues)
r.rpush("job_queue", json.dumps({"task": "send_email", "to": "alice@example.com"}))
job = r.blpop("job_queue", timeout=5)  # Blocking pop — waits up to 5s
```

---

## Cache Invalidation

"There are only two hard problems in computer science: cache invalidation and naming things." — Phil Karlton

Strategies for keeping your cache fresh:

```python
# 1. TTL-based: simplest, accept eventual consistency within the TTL window
r.set(key, value, ex=60)  # Becomes stale after 60 seconds, re-fetched on next miss

# 2. Event-driven invalidation: delete the cache entry when data changes
def update_user(user_id, data):
    db.update(user_id, data)
    r.delete(f"user:{user_id}")  # Invalidate immediately

# 3. Cache versioning: embed a version in the key
CACHE_VERSION = 3
key = f"v{CACHE_VERSION}:user:{user_id}"
# Increment CACHE_VERSION to globally invalidate all entries at once

# 4. Write-through: update cache on every write (no stale window, but slower writes)
def update_user(user_id, data):
    db.update(user_id, data)
    r.set(f"user:{user_id}", json.dumps(data), ex=3600)
```

---

## Key Takeaways

- **Cache what is expensive and repeatable**: computation, DB queries, HTTP calls — not trivial attribute access.
- **`functools.lru_cache(maxsize=N)`** is the standard in-process memoization tool. It uses LRU eviction and requires hashable arguments. Call `.cache_info()` to measure hit rate and `.cache_clear()` to invalidate.
- **`functools.cache`** (Python 3.9+) is `lru_cache(maxsize=None)` with simpler spelling. Use it when the input space is small and bounded.
- **`functools.cached_property`** computes a property once per instance and stores it as an instance attribute. Invalidate with `del obj.property_name`.
- **TTL caching** (via `cachetools.TTLCache` or manual implementation) is necessary when data becomes stale over time.
- **Redis** provides distributed caching shared across multiple processes, workers, and machines. Use `json.dumps`/`json.loads` for serialization and always set a TTL with `ex=`.
- **Cache invalidation is the hardest part.** Prefer TTL-based caching for simplicity, event-driven invalidation for correctness, and cache versioning for global resets.
- **Measure the hit rate.** A cache with a 30% hit rate may not be worth the complexity. Aim for 80%+ before declaring victory.
