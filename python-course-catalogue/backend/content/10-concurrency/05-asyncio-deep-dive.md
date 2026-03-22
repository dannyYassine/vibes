---
title: "Asyncio Deep Dive: Tasks, Streams & Queues"
description: "Go beyond async/await basics with tasks, streams, queues, and real-world async patterns."
duration_minutes: 40
order: 5
---

## Recap: The Event Loop and Coroutines

Asyncio is a **single-threaded, cooperative concurrency** model. A single event loop runs on one thread and executes coroutines by switching between them at `await` points.

```python
import asyncio

# async def defines a coroutine function
# calling it returns a coroutine object (not executed yet)
async def greet(name: str, delay: float) -> str:
    print(f"Hello, {name}!")
    await asyncio.sleep(delay)  # Suspends this coroutine, other coroutines can run
    print(f"Goodbye, {name}!")
    return f"done:{name}"

# asyncio.run() creates the event loop, runs the coroutine, then closes the loop
result = asyncio.run(greet("World", 1.0))
print(result)  # "done:World"
```

Key mental model: at any `await`, the current coroutine **pauses** and hands control back to the event loop, which runs other coroutines until the awaited value is ready.

## Sequential vs Concurrent Execution

The most common beginner mistake is writing sequential code when you want concurrent code:

```python
import asyncio
import time

async def fetch(name: str, delay: float) -> str:
    print(f"Starting {name}")
    await asyncio.sleep(delay)  # Simulates I/O wait (e.g., HTTP request)
    print(f"Done {name}")
    return f"result:{name}"

async def sequential():
    """Total time ≈ sum of all delays."""
    start = time.perf_counter()
    r1 = await fetch("A", 1.0)  # Waits 1s, THEN starts B
    r2 = await fetch("B", 1.0)  # Waits 1s, THEN starts C
    r3 = await fetch("C", 1.0)  # Waits 1s
    elapsed = time.perf_counter() - start
    print(f"Sequential: {elapsed:.2f}s")  # ~3 seconds

async def concurrent_with_tasks():
    """Total time ≈ max of all delays."""
    start = time.perf_counter()
    # create_task schedules ALL coroutines to run before any await
    t1 = asyncio.create_task(fetch("A", 1.0))
    t2 = asyncio.create_task(fetch("B", 1.0))
    t3 = asyncio.create_task(fetch("C", 1.0))
    # Now await them — all three are already running
    r1 = await t1
    r2 = await t2
    r3 = await t3
    elapsed = time.perf_counter() - start
    print(f"Concurrent: {elapsed:.2f}s")  # ~1 second

asyncio.run(sequential())
asyncio.run(concurrent_with_tasks())
```

## asyncio.create_task()

`create_task()` wraps a coroutine in a `Task`, schedules it to run on the event loop, and returns immediately. The task starts running the next time the event loop gets control.

```python
import asyncio

async def background_work(task_id: int) -> int:
    print(f"Task {task_id}: starting")
    await asyncio.sleep(1)
    print(f"Task {task_id}: finishing")
    return task_id * 100

async def main():
    # Create tasks — they are scheduled immediately
    tasks = [asyncio.create_task(background_work(i)) for i in range(5)]

    # Do other work while tasks run in background
    print("Main: doing other work...")
    await asyncio.sleep(0.5)
    print("Main: still here...")

    # Wait for all tasks and collect results
    results = await asyncio.gather(*tasks)
    print(f"Results: {results}")  # [0, 100, 200, 300, 400]

asyncio.run(main())
```

The difference between `asyncio.create_task(coro)` and a bare `await coro`:
- `create_task(coro)` — schedules immediately, runs concurrently with other tasks
- `await coro` — runs sequentially, suspends the caller until `coro` completes

## asyncio.gather(): Run Multiple Coroutines Concurrently

`gather()` is the most common way to run several coroutines concurrently and collect all their results:

```python
import asyncio

async def fetch_user(user_id: int) -> dict:
    await asyncio.sleep(0.1)  # Simulate DB/API call
    return {"id": user_id, "name": f"User {user_id}"}

async def fetch_orders(user_id: int) -> list:
    await asyncio.sleep(0.2)  # Simulate slower API call
    return [{"order_id": i, "user_id": user_id} for i in range(3)]

async def main():
    # Run both concurrently, wait for both to complete
    user, orders = await asyncio.gather(
        fetch_user(42),
        fetch_orders(42),
    )
    print(f"User: {user}")
    print(f"Orders: {orders}")

    # return_exceptions=True: exceptions are returned as results instead of raised
    results = await asyncio.gather(
        fetch_user(1),
        asyncio.sleep(0),  # Simulate something that might fail
        return_exceptions=True,
    )
    for r in results:
        if isinstance(r, Exception):
            print(f"  Error: {r}")
        else:
            print(f"  OK: {r}")

asyncio.run(main())
```

Without `return_exceptions=True`, the first exception cancels all remaining tasks and is re-raised from `gather()`.

## asyncio.wait(): Lower-Level Waiting

`asyncio.wait()` gives more control than `gather()` — it returns two sets: tasks that are done and tasks still pending:

```python
import asyncio

async def variable_task(n: int) -> int:
    await asyncio.sleep(n * 0.3)
    if n == 2:
        raise ValueError(f"Task {n} failed")
    return n * 10

async def main():
    tasks = {asyncio.create_task(variable_task(i)) for i in range(5)}

    # Return when at least one task completes
    done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
    print(f"First done: {len(done)} task(s)")

    # Cancel all remaining tasks
    for task in pending:
        task.cancel()

    # Process completed tasks
    for task in done:
        try:
            result = task.result()
            print(f"  Result: {result}")
        except Exception as e:
            print(f"  Exception: {e}")

    # Wait for cancellations to propagate
    await asyncio.gather(*pending, return_exceptions=True)

asyncio.run(main())
```

## asyncio.Queue: Async-Friendly Producer-Consumer

`asyncio.Queue` is like `queue.Queue` but its `put()` and `get()` are coroutines that suspend instead of block:

```python
import asyncio
import random

async def producer(queue: asyncio.Queue, n_items: int) -> None:
    for i in range(n_items):
        item = f"item-{i}"
        await queue.put(item)  # Suspends if queue is full (when maxsize > 0)
        print(f"Produced: {item}")
        await asyncio.sleep(random.uniform(0.01, 0.05))
    # Signal consumers to stop
    for _ in range(3):  # One sentinel per consumer
        await queue.put(None)

async def consumer(name: str, queue: asyncio.Queue) -> int:
    count = 0
    while True:
        item = await queue.get()  # Suspends until an item is available
        if item is None:
            queue.task_done()
            break
        print(f"  [{name}] Consumed: {item}")
        await asyncio.sleep(random.uniform(0.05, 0.15))  # Simulate processing
        queue.task_done()
        count += 1
    return count

async def main():
    queue: asyncio.Queue = asyncio.Queue(maxsize=5)

    producer_task = asyncio.create_task(producer(queue, 15))
    consumer_tasks = [
        asyncio.create_task(consumer(f"C{i}", queue))
        for i in range(3)
    ]

    await producer_task
    counts = await asyncio.gather(*consumer_tasks)
    await queue.join()  # Ensure all task_done() calls have been made
    print(f"Items processed per consumer: {counts}")

asyncio.run(main())
```

## asyncio.Semaphore: Rate Limiting

`asyncio.Semaphore(n)` limits how many coroutines can run a section of code concurrently — essential for rate-limiting API calls:

```python
import asyncio
import time

async def call_api(session_id: int, semaphore: asyncio.Semaphore) -> str:
    async with semaphore:  # Only N coroutines inside this block at once
        print(f"  Calling API with session {session_id}")
        await asyncio.sleep(0.5)  # Simulate API call
        return f"response-{session_id}"

async def main():
    # Allow at most 3 concurrent API calls
    semaphore = asyncio.Semaphore(3)

    start = time.perf_counter()
    tasks = [asyncio.create_task(call_api(i, semaphore)) for i in range(12)]
    results = await asyncio.gather(*tasks)
    elapsed = time.perf_counter() - start

    print(f"\n12 API calls with concurrency=3 in {elapsed:.2f}s")
    # 4 batches of 3 × 0.5s = ~2s instead of 12 × 0.5s = 6s
    print(f"First few: {results[:3]}")

asyncio.run(main())
```

## Timeouts: asyncio.timeout and asyncio.wait_for

Enforce deadlines on coroutines:

```python
import asyncio

async def slow_operation() -> str:
    await asyncio.sleep(5)
    return "done"

async def main():
    # asyncio.wait_for: wraps a coroutine with a timeout (Python 3.4+)
    try:
        result = await asyncio.wait_for(slow_operation(), timeout=2.0)
    except asyncio.TimeoutError:
        print("wait_for: timed out after 2s")

    # asyncio.timeout: context manager syntax (Python 3.11+)
    try:
        async with asyncio.timeout(2.0):
            result = await slow_operation()
    except asyncio.TimeoutError:
        print("timeout: timed out after 2s")

    # asyncio.timeout_at: deadline as absolute time
    deadline = asyncio.get_event_loop().time() + 2.0
    try:
        async with asyncio.timeout_at(deadline):
            result = await slow_operation()
    except asyncio.TimeoutError:
        print("timeout_at: passed deadline")

asyncio.run(main())
```

When a timeout fires, the inner coroutine receives a `CancelledError`, which is converted to `TimeoutError` at the `wait_for`/`timeout` boundary.

## Async Context Managers

Use `async with` for async setup and teardown — common for database connections, HTTP sessions, locks:

```python
import asyncio

class AsyncDatabaseConnection:
    def __init__(self, url: str):
        self.url = url
        self.connection = None

    async def __aenter__(self):
        print(f"Opening connection to {self.url}")
        await asyncio.sleep(0.1)  # Simulate async connection setup
        self.connection = {"url": self.url, "active": True}
        return self.connection

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        print("Closing connection")
        await asyncio.sleep(0.05)  # Simulate async cleanup
        self.connection["active"] = False
        return False  # Don't suppress exceptions

async def main():
    async with AsyncDatabaseConnection("postgresql://localhost/mydb") as conn:
        print(f"Using connection: {conn}")
        await asyncio.sleep(0.1)  # Simulate queries
    print("Connection closed")

asyncio.run(main())
```

## Async Iterators and async for

```python
import asyncio

class AsyncCounter:
    """Async iterator that yields numbers with a delay between each."""
    def __init__(self, start: int, stop: int, delay: float):
        self.current = start
        self.stop = stop
        self.delay = delay

    def __aiter__(self):
        return self

    async def __anext__(self) -> int:
        if self.current >= self.stop:
            raise StopAsyncIteration
        await asyncio.sleep(self.delay)
        value = self.current
        self.current += 1
        return value

async def main():
    async for number in AsyncCounter(0, 5, 0.1):
        print(f"  Got: {number}")

    # Async generator functions (simpler syntax)
    async def count_up(n: int):
        for i in range(n):
            await asyncio.sleep(0.05)
            yield i

    async for x in count_up(5):
        print(f"  Generated: {x}")

asyncio.run(main())
```

## asyncio Streams: TCP Client

`asyncio.open_connection()` creates a TCP connection and returns `(StreamReader, StreamWriter)`:

```python
import asyncio

async def tcp_echo_client(host: str, port: int, message: str) -> str:
    reader, writer = await asyncio.open_connection(host, port)

    # Send data
    writer.write(message.encode())
    writer.write_eof()
    await writer.drain()  # Flush the write buffer

    # Read response
    data = await reader.read(1024)      # Read up to N bytes
    # line = await reader.readline()   # Read until \n
    # chunk = await reader.readexactly(10)  # Read exactly N bytes

    writer.close()
    await writer.wait_closed()  # Wait for close to complete
    return data.decode()

async def tcp_echo_server(reader: asyncio.StreamReader, writer: asyncio.StreamWriter):
    """Called for each new client connection."""
    addr = writer.get_extra_info("peername")
    print(f"New connection from {addr}")

    data = await reader.read(1024)
    message = data.decode()
    print(f"Received: {message!r}")

    writer.write(data)  # Echo back
    await writer.drain()
    writer.close()

async def run_server():
    server = await asyncio.start_server(
        tcp_echo_server, "127.0.0.1", 8888
    )
    async with server:
        await server.serve_forever()

# Run client and server together for testing:
async def demo():
    server = await asyncio.start_server(tcp_echo_server, "127.0.0.1", 8889)
    async with server:
        result = await tcp_echo_client("127.0.0.1", 8889, "Hello, World!")
        print(f"Echo received: {result}")

asyncio.run(demo())
```

## Running Synchronous Code Without Blocking

If you must call a blocking function from async code, run it in a thread pool to avoid blocking the event loop:

```python
import asyncio
import time

def blocking_io(filepath: str) -> str:
    """A blocking file read — would freeze the event loop if called directly."""
    time.sleep(1)  # Simulate slow disk
    return f"contents of {filepath}"

def cpu_intensive(n: int) -> int:
    return sum(i * i for i in range(n))

async def main():
    # asyncio.to_thread: Python 3.9+ — wraps blocking function in a thread
    result = await asyncio.to_thread(blocking_io, "/path/to/file")
    print(f"File read: {result}")

    # Loop.run_in_executor: lower-level, works with custom executors
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, blocking_io, "/other/file")
    # None uses the default ThreadPoolExecutor

    # Use ProcessPoolExecutor for CPU-bound blocking work
    from concurrent.futures import ProcessPoolExecutor
    with ProcessPoolExecutor() as pool:
        result = await loop.run_in_executor(pool, cpu_intensive, 5_000_000)
        print(f"CPU result: {result}")

asyncio.run(main())
```

## Common Mistakes

### 1. Blocking the Event Loop

```python
import asyncio
import time

# BAD: time.sleep() blocks the entire event loop — nothing else can run
async def bad_sleep():
    print("Starting bad sleep")
    time.sleep(2)  # Event loop is FROZEN for 2 seconds
    print("Done bad sleep")

# GOOD: asyncio.sleep() yields control back to the event loop
async def good_sleep():
    print("Starting good sleep")
    await asyncio.sleep(2)  # Other coroutines can run during these 2 seconds
    print("Done good sleep")
```

### 2. Forgetting await

```python
import asyncio

async def fetch_data() -> str:
    await asyncio.sleep(0.1)
    return "data"

async def main():
    # BAD: no await — result is a coroutine object, not the string
    result = fetch_data()  # <coroutine object fetch_data at 0x...>
    print(result)  # Not "data"!
    # Python 3.11+ will warn: RuntimeWarning: coroutine 'fetch_data' was never awaited

    # GOOD
    result = await fetch_data()
    print(result)  # "data"

asyncio.run(main())
```

### 3. Fire-and-Forget Tasks Being Garbage Collected

```python
import asyncio

async def background_task(n: int):
    await asyncio.sleep(1)
    print(f"Background task {n} done")

async def bad_fire_and_forget():
    # BAD: the task may be garbage collected before it completes
    asyncio.create_task(background_task(1))
    await asyncio.sleep(0.5)
    # Task might be GC'd here and never complete

async def good_fire_and_forget():
    # GOOD: keep a strong reference to the task
    task = asyncio.create_task(background_task(2))
    # Or store in a set:
    background_tasks = set()
    task2 = asyncio.create_task(background_task(3))
    background_tasks.add(task2)
    task2.add_done_callback(background_tasks.discard)  # Auto-remove when done

    await asyncio.sleep(2)  # Give tasks time to complete

asyncio.run(good_fire_and_forget())
```

## Real Example: Async HTTP Client with Rate Limiting

```python
import asyncio
import time
import urllib.request
from dataclasses import dataclass

@dataclass
class HttpResult:
    url: str
    status: int
    elapsed: float
    error: str | None = None

async def fetch_url(url: str, semaphore: asyncio.Semaphore) -> HttpResult:
    """Fetch a URL, but only if a semaphore slot is available."""
    async with semaphore:
        start = time.perf_counter()
        try:
            # Note: real async HTTP should use aiohttp or httpx[asyncio]
            # Here we use asyncio.to_thread to avoid blocking
            def _blocking_fetch():
                import urllib.request
                with urllib.request.urlopen(url, timeout=5) as resp:
                    resp.read()
                    return resp.status

            status = await asyncio.to_thread(_blocking_fetch)
            return HttpResult(url=url, status=status, elapsed=time.perf_counter() - start)
        except Exception as e:
            return HttpResult(url=url, status=0,
                              elapsed=time.perf_counter() - start, error=str(e))

async def fetch_all_rate_limited(urls: list[str], max_concurrent: int = 5) -> list[HttpResult]:
    semaphore = asyncio.Semaphore(max_concurrent)
    tasks = [asyncio.create_task(fetch_url(url, semaphore)) for url in urls]
    return await asyncio.gather(*tasks)

async def main():
    urls = [
        "https://httpbin.org/status/200",
        "https://httpbin.org/status/201",
        "https://httpbin.org/status/404",
        "https://httpbin.org/delay/1",
        "https://httpbin.org/delay/1",
        "https://httpbin.org/json",
    ]

    start = time.perf_counter()
    results = await fetch_all_rate_limited(urls, max_concurrent=3)
    total = time.perf_counter() - start

    for r in results:
        icon = "OK" if r.status == 200 else "!!"
        print(f"  [{icon}] {r.status}  {r.elapsed:.2f}s  {r.url[:50]}")

    print(f"\n{len(results)} requests in {total:.2f}s (max 3 concurrent)")

asyncio.run(main())
```

## Key Takeaways

- `async def` defines a coroutine; calling it returns a coroutine object. Use `await` to actually run it.
- Two `await` calls in sequence are **sequential**. Use `asyncio.create_task()` before `await` to run coroutines concurrently.
- `asyncio.gather(*coros)` runs multiple coroutines concurrently and returns all results — the go-to for fan-out patterns.
- `asyncio.wait(tasks, return_when=...)` provides fine-grained control with `FIRST_COMPLETED`, `FIRST_EXCEPTION`, `ALL_COMPLETED`.
- `asyncio.Queue` is the async-safe way to implement producer-consumer pipelines. Its `put()` and `get()` are coroutines.
- `asyncio.Semaphore(n)` limits concurrency within an async context — essential for rate-limiting API calls.
- Use `asyncio.wait_for(coro, timeout)` or `asyncio.timeout(seconds)` (Python 3.11+) to enforce deadlines.
- Never call blocking functions (time.sleep, blocking I/O) directly in a coroutine — use `await asyncio.to_thread(fn)` or `run_in_executor()` to run them in a thread.
- Always keep a reference to tasks created with `create_task()` to prevent garbage collection before completion.
- Forgetting `await` before a coroutine call is a silent bug: you get a coroutine object, not the result.
