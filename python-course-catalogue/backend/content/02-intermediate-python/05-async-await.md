---
title: "Async/Await"
description: "Write concurrent code with Python's asyncio for I/O-bound operations."
duration_minutes: 35
order: 5
---

## Why Async?

Traditional synchronous code blocks while waiting for I/O:

```python
# Synchronous - blocks on each request
import requests

def fetch_all():
    urls = ["http://api1.com", "http://api2.com", "http://api3.com"]
    results = []
    for url in urls:
        response = requests.get(url)  # Blocks here
        results.append(response.json())
    return results
```

Async code can handle multiple operations concurrently:

```python
# Asynchronous - concurrent I/O
import asyncio
import httpx

async def fetch_all():
    urls = ["http://api1.com", "http://api2.com", "http://api3.com"]
    async with httpx.AsyncClient() as client:
        tasks = [client.get(url) for url in urls]
        responses = await asyncio.gather(*tasks)
        return [r.json() for r in responses]
```

## Basic Syntax

### async def and await

```python
import asyncio

async def greet(name):
    print(f"Hello, {name}!")
    await asyncio.sleep(1)  # Non-blocking sleep
    print(f"Goodbye, {name}!")

# Running async code
asyncio.run(greet("Alice"))
```

### Coroutines

An `async def` function returns a coroutine object:

```python
async def my_coroutine():
    return 42

coro = my_coroutine()  # Creates coroutine, doesn't run it
result = asyncio.run(coro)  # Actually runs it
```

## Running Concurrent Tasks

### asyncio.gather

Run multiple coroutines concurrently:

```python
async def fetch_user(user_id):
    await asyncio.sleep(1)  # Simulate API call
    return {"id": user_id, "name": f"User {user_id}"}

async def main():
    # Run all fetches concurrently
    users = await asyncio.gather(
        fetch_user(1),
        fetch_user(2),
        fetch_user(3),
    )
    print(users)

asyncio.run(main())
# Takes ~1 second, not ~3 seconds
```

### asyncio.create_task

Create and manage individual tasks:

```python
async def main():
    # Create tasks (start immediately)
    task1 = asyncio.create_task(fetch_user(1))
    task2 = asyncio.create_task(fetch_user(2))

    # Do other work while tasks run...

    # Wait for results
    user1 = await task1
    user2 = await task2
```

### asyncio.wait

More control over task completion:

```python
async def main():
    tasks = [
        asyncio.create_task(fetch_user(i))
        for i in range(5)
    ]

    # Wait for first to complete
    done, pending = await asyncio.wait(
        tasks,
        return_when=asyncio.FIRST_COMPLETED
    )

    for task in done:
        print(task.result())
```

## Error Handling

```python
async def risky_operation():
    await asyncio.sleep(1)
    raise ValueError("Something went wrong")

async def main():
    try:
        await risky_operation()
    except ValueError as e:
        print(f"Caught: {e}")

# With gather, use return_exceptions
async def main():
    results = await asyncio.gather(
        risky_operation(),
        fetch_user(1),
        return_exceptions=True
    )
    for result in results:
        if isinstance(result, Exception):
            print(f"Error: {result}")
        else:
            print(f"Success: {result}")
```

## Timeouts

```python
async def slow_operation():
    await asyncio.sleep(10)
    return "done"

async def main():
    try:
        result = await asyncio.wait_for(
            slow_operation(),
            timeout=2.0
        )
    except asyncio.TimeoutError:
        print("Operation timed out")
```

## Async Context Managers

```python
class AsyncResource:
    async def __aenter__(self):
        print("Acquiring resource")
        await asyncio.sleep(0.1)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        print("Releasing resource")
        await asyncio.sleep(0.1)

async def main():
    async with AsyncResource() as resource:
        print("Using resource")
```

## Async Iterators

```python
class AsyncCounter:
    def __init__(self, limit):
        self.limit = limit
        self.count = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.count >= self.limit:
            raise StopAsyncIteration
        self.count += 1
        await asyncio.sleep(0.1)
        return self.count

async def main():
    async for num in AsyncCounter(5):
        print(num)
```

### Async Generator

```python
async def async_range(start, stop):
    for i in range(start, stop):
        await asyncio.sleep(0.1)
        yield i

async def main():
    async for num in async_range(1, 5):
        print(num)
```

## Semaphores and Locks

Control concurrent access:

```python
# Limit concurrent operations
semaphore = asyncio.Semaphore(3)

async def limited_fetch(url):
    async with semaphore:  # Only 3 at a time
        # fetch url
        pass

# Mutex lock
lock = asyncio.Lock()

async def safe_increment():
    async with lock:
        # Critical section
        pass
```

## Common Patterns

### Producer-Consumer with Queue

```python
async def producer(queue):
    for i in range(5):
        await queue.put(i)
        await asyncio.sleep(0.1)
    await queue.put(None)  # Signal done

async def consumer(queue):
    while True:
        item = await queue.get()
        if item is None:
            break
        print(f"Processing {item}")

async def main():
    queue = asyncio.Queue()
    await asyncio.gather(
        producer(queue),
        consumer(queue)
    )
```

## Key Takeaways

1. `async def` creates coroutines; `await` pauses until complete
2. Use `asyncio.gather()` to run coroutines concurrently
3. `asyncio.create_task()` starts a task immediately
4. Async is for I/O-bound work, not CPU-bound
5. Use `async with` and `async for` for async resources
6. Semaphores limit concurrent operations
