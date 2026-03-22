---
title: "concurrent.futures: ThreadPool & ProcessPool"
description: "Use the high-level concurrent.futures API for clean parallel execution."
duration_minutes: 25
order: 4
---

## Why concurrent.futures?

Python's `threading` and `multiprocessing` modules are powerful but low-level. You manage thread/process creation, communication, and result collection manually. The `concurrent.futures` module (Python 3.2+) provides a **unified, high-level API** for both thread-based and process-based concurrency:

- No manual thread/process lifecycle management
- `Future` objects represent pending results
- Same API whether you use threads or processes — easy to switch
- Clean exception propagation from worker to caller
- Built-in context manager support

```python
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor
import os

def square(n: int) -> int:
    return n * n

# Thread-based
with ThreadPoolExecutor(max_workers=4) as executor:
    results = list(executor.map(square, range(10)))
    print(results)  # [0, 1, 4, 9, 16, 25, 36, 49, 64, 81]

# Process-based — identical API, just swap the class
if __name__ == "__main__":
    with ProcessPoolExecutor(max_workers=os.cpu_count()) as executor:
        results = list(executor.map(square, range(10)))
        print(results)  # Same output, but each call runs in a separate process
```

## ThreadPoolExecutor

`ThreadPoolExecutor(max_workers=N)` maintains a pool of N threads. Tasks submitted to it are queued and dispatched to free threads.

```python
from concurrent.futures import ThreadPoolExecutor
import time

def fetch_data(source: str) -> str:
    """Simulate I/O-bound work."""
    time.sleep(1)
    return f"data from {source}"

sources = ["db", "cache", "api", "file", "queue"]

# Using the with statement ensures all threads are joined on exit
with ThreadPoolExecutor(max_workers=5) as executor:
    # submit() dispatches one task and returns a Future immediately
    future_a = executor.submit(fetch_data, "db")
    future_b = executor.submit(fetch_data, "api")

    # .result() blocks until the task completes and returns the value
    print(future_a.result())  # "data from db"
    print(future_b.result())  # "data from api"

    # map() submits all tasks and returns results in input order
    # It is a lazy iterator; results are yielded as they complete (in order)
    start = time.perf_counter()
    results = list(executor.map(fetch_data, sources))
    elapsed = time.perf_counter() - start
    print(f"5 sources fetched in {elapsed:.2f}s")  # ~1s, not 5s
```

If `max_workers` is not specified, `ThreadPoolExecutor` defaults to `min(32, os.cpu_count() + 4)` in Python 3.8+. For I/O-bound work, you often want more workers (e.g., 20-100) since threads spend most of their time blocked.

## ProcessPoolExecutor

`ProcessPoolExecutor(max_workers=N)` works identically from the API perspective but uses OS processes:

```python
import os
import time
from concurrent.futures import ProcessPoolExecutor

def cpu_crunch(n: int) -> int:
    """Simulate CPU-bound work."""
    return sum(i * i for i in range(n))

if __name__ == "__main__":
    tasks = [5_000_000] * 8  # 8 heavy tasks

    # Sequential
    start = time.perf_counter()
    seq_results = [cpu_crunch(n) for n in tasks]
    seq_time = time.perf_counter() - start

    # Parallel (4 processes)
    start = time.perf_counter()
    with ProcessPoolExecutor(max_workers=4) as executor:
        par_results = list(executor.map(cpu_crunch, tasks))
    par_time = time.perf_counter() - start

    print(f"Sequential:  {seq_time:.2f}s")
    print(f"Parallel:    {par_time:.2f}s")
    print(f"Speedup:     {seq_time / par_time:.1f}x")
```

`max_workers` defaults to `os.cpu_count()` for `ProcessPoolExecutor`.

## The Future Object

`executor.submit()` returns a `Future` immediately — the computation runs in the background. The `Future` is your handle to query the state and retrieve the result.

```python
from concurrent.futures import ThreadPoolExecutor, Future
import time

def slow_add(a: int, b: int) -> int:
    time.sleep(2)
    return a + b

with ThreadPoolExecutor(max_workers=2) as executor:
    future: Future = executor.submit(slow_add, 10, 20)

    # Non-blocking checks
    print(future.done())      # False (probably)
    print(future.cancelled()) # False

    # Add a callback that runs when the future completes
    # The callback receives the Future as its only argument
    future.add_done_callback(lambda f: print(f"Callback: result = {f.result()}"))

    # Block until done, with optional timeout
    try:
        result = future.result(timeout=5.0)  # Raises TimeoutError if not done in 5s
        print(f"Result: {result}")  # 30
    except TimeoutError:
        print("Timed out!")
        future.cancel()  # Only works if the task hasn't started yet

    # Check for exceptions raised in the worker
    future2: Future = executor.submit(lambda: 1 / 0)

# Note: accessing future2.result() outside the `with` block also works
# because the executor waited for all futures on __exit__
try:
    value = future2.result()
except ZeroDivisionError as e:
    print(f"Worker raised: {e}")  # Worker raised: division by zero
```

Key `Future` methods:

- `.result(timeout=None)` — block and return result, or re-raise worker exception
- `.exception(timeout=None)` — block and return the exception (or `None` if success)
- `.done()` — `True` if finished (success or failure)
- `.cancelled()` — `True` if cancelled before starting
- `.cancel()` — attempt to cancel; returns `True` only if the task hasn't started
- `.add_done_callback(fn)` — register a callable to run when done (runs in the thread that completed the future)

## as_completed: Process Results Out of Order

`executor.map()` returns results in submission order — it waits for the first item even if later items finish sooner. `as_completed()` yields futures as they finish, in completion order:

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import random

def variable_task(task_id: int) -> dict:
    duration = random.uniform(0.1, 2.0)
    time.sleep(duration)
    return {"id": task_id, "duration": duration}

with ThreadPoolExecutor(max_workers=5) as executor:
    futures = {
        executor.submit(variable_task, i): i
        for i in range(10)
    }

    start = time.perf_counter()
    for future in as_completed(futures):
        task_id = futures[future]  # Map future back to its input
        try:
            result = future.result()
            elapsed = time.perf_counter() - start
            print(f"  [{elapsed:.2f}s] Task {task_id} done: {result['duration']:.2f}s")
        except Exception as e:
            print(f"  Task {task_id} failed: {e}")
```

The dictionary pattern `{executor.submit(fn, arg): arg}` is idiomatic — it maps each `Future` back to its input for error messages and result correlation.

## wait(): Fine-Grained Control

`wait()` lets you wait for specific conditions before proceeding:

```python
from concurrent.futures import ThreadPoolExecutor, wait, FIRST_COMPLETED, FIRST_EXCEPTION, ALL_COMPLETED
import time

def task(n: int) -> int:
    time.sleep(n * 0.5)
    if n == 3:
        raise ValueError(f"Task {n} failed!")
    return n * 10

with ThreadPoolExecutor(max_workers=5) as executor:
    futures = [executor.submit(task, i) for i in range(5)]

    # Wait until at least one future completes
    done, pending = wait(futures, return_when=FIRST_COMPLETED)
    print(f"First done: {[f.result() for f in done]}")
    print(f"Still pending: {len(pending)}")

    # Wait until first exception or all done
    done, pending = wait(futures, return_when=FIRST_EXCEPTION)
    for f in done:
        if f.exception():
            print(f"Got exception: {f.exception()}")

    # Wait for all to complete (same as letting `with` block exit)
    done, pending = wait(futures, return_when=ALL_COMPLETED, timeout=10)
    print(f"All done: {len(done)}, pending: {len(pending)}")
```

## Exception Propagation

Exceptions raised in worker functions are captured and re-raised when you call `.result()`:

```python
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

class CustomError(Exception):
    pass

def risky_operation(x: int) -> int:
    if x < 0:
        raise CustomError(f"Negative input: {x}")
    if x == 0:
        raise ZeroDivisionError("Cannot process zero")
    return 100 // x

with ThreadPoolExecutor(max_workers=3) as executor:
    futures = [executor.submit(risky_operation, x) for x in [-1, 0, 5, 10]]

    for i, future in enumerate(futures):
        try:
            result = future.result()
            print(f"futures[{i}]: {result}")
        except CustomError as e:
            print(f"futures[{i}] CustomError: {e}")
        except ZeroDivisionError as e:
            print(f"futures[{i}] ZeroDivisionError: {e}")
```

With `executor.map()`, exceptions are also re-raised but only when you iterate the results:

```python
with ThreadPoolExecutor(max_workers=3) as executor:
    result_iter = executor.map(risky_operation, [-1, 0, 5, 10])
    try:
        for result in result_iter:
            print(result)
    except CustomError as e:
        print(f"Caught from map: {e}")
    # Note: map() stops at the first exception; remaining results are discarded
```

## Cancellation and Timeouts

```python
from concurrent.futures import ThreadPoolExecutor
import time

def long_running():
    time.sleep(30)
    return "done"

with ThreadPoolExecutor(max_workers=2) as executor:
    # Submit more tasks than workers; the backlog can be cancelled
    futures = [executor.submit(long_running) for _ in range(5)]

    # Cancel tasks that haven't started yet
    cancelled_count = 0
    for f in futures:
        if f.cancel():
            cancelled_count += 1
    print(f"Cancelled {cancelled_count} pending tasks")

    # Timeout on result retrieval
    f = executor.submit(long_running)
    try:
        result = f.result(timeout=1.0)
    except TimeoutError:
        print("Result timed out (task still running in background)")
        f.cancel()  # Won't work if already started, but try
```

Note: `cancel()` returns `True` only if the task was in the queue and hadn't started. Once a thread picks it up, cancellation is not possible without a cooperative cancellation mechanism.

## Choosing max_workers

```python
import os

# I/O-bound: threads spend most time waiting, so more workers = more concurrency
# Typical formula for I/O-bound ThreadPoolExecutor:
io_workers = min(32, (os.cpu_count() or 1) * 5)  # Python's own default calculation

# CPU-bound: each worker needs a real core; excess workers just add overhead
cpu_workers = os.cpu_count()  # One worker per core

print(f"Recommended I/O workers: {io_workers}")
print(f"Recommended CPU workers: {cpu_workers}")

# For API calls with rate limits, cap to the rate limit
rate_limited_workers = 10  # Don't exceed server's allowed concurrent connections
```

## Real Example: Downloading Multiple URLs in Parallel

```python
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request
import urllib.error
import time
from dataclasses import dataclass

@dataclass
class FetchResult:
    url: str
    status: int
    content_length: int
    elapsed: float
    error: str | None = None

def fetch_url(url: str) -> FetchResult:
    start = time.perf_counter()
    try:
        with urllib.request.urlopen(url, timeout=10) as response:
            content = response.read()
            return FetchResult(
                url=url,
                status=response.status,
                content_length=len(content),
                elapsed=time.perf_counter() - start,
            )
    except urllib.error.HTTPError as e:
        return FetchResult(url=url, status=e.code, content_length=0,
                           elapsed=time.perf_counter() - start, error=str(e))
    except Exception as e:
        return FetchResult(url=url, status=0, content_length=0,
                           elapsed=time.perf_counter() - start, error=str(e))

def download_all(urls: list[str], max_workers: int = 10) -> list[FetchResult]:
    results = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        future_to_url = {executor.submit(fetch_url, url): url for url in urls}
        for future in as_completed(future_to_url):
            result = future.result()  # Won't raise — we handle exceptions in fetch_url
            results.append(result)
            status_icon = "OK" if result.status == 200 else "FAIL"
            print(f"  [{status_icon}] {result.status} {result.url} ({result.elapsed:.2f}s)")
    return results

if __name__ == "__main__":
    urls = [
        "https://httpbin.org/status/200",
        "https://httpbin.org/status/404",
        "https://httpbin.org/json",
        "https://httpbin.org/delay/1",
        "https://httpbin.org/delay/1",
    ]
    start = time.perf_counter()
    results = download_all(urls, max_workers=5)
    total = time.perf_counter() - start

    print(f"\n{len(results)} URLs fetched in {total:.2f}s")
    print(f"Fastest: {min(results, key=lambda r: r.elapsed).elapsed:.2f}s")
    print(f"Slowest: {max(results, key=lambda r: r.elapsed).elapsed:.2f}s")
```

## concurrent.futures vs asyncio

Both handle concurrency, but they have different models:

| Aspect | concurrent.futures | asyncio |
|---|---|---|
| Unit of work | Thread/process (OS-managed) | Coroutine (Python cooperative) |
| Overhead | OS thread/process creation | Very low (pure Python) |
| Blocking I/O | Fine (thread blocks, others run) | Must use async libraries or run_in_executor |
| CPU-bound | ProcessPoolExecutor | Run in executor |
| Error handling | `.result()` re-raises | `await` re-raises, or `gather(return_exceptions=True)` |
| Best for | Mixing sync and async, simple parallelism | High-concurrency I/O, async frameworks |

Use `asyncio.get_event_loop().run_in_executor(executor, fn, *args)` to bridge the two:

```python
import asyncio
from concurrent.futures import ProcessPoolExecutor

def cpu_bound_task(n: int) -> int:
    return sum(i * i for i in range(n))

async def main():
    loop = asyncio.get_event_loop()
    with ProcessPoolExecutor() as pool:
        # Run CPU-bound work in a process without blocking the event loop
        result = await loop.run_in_executor(pool, cpu_bound_task, 5_000_000)
        print(f"CPU result: {result}")

asyncio.run(main())
```

## Key Takeaways

- `concurrent.futures` provides a unified, high-level API for both thread (`ThreadPoolExecutor`) and process (`ProcessPoolExecutor`) based parallelism.
- `executor.submit(fn, *args)` returns a `Future` immediately; `.result()` blocks until the computation is done and re-raises any exception from the worker.
- `executor.map(fn, iterable)` submits all tasks and returns an iterator of results **in input order**.
- `as_completed(futures)` yields futures as they finish, in **completion order** — better when you want to process results as soon as they are ready.
- `wait(futures, return_when=...)` offers fine-grained waiting with `FIRST_COMPLETED`, `FIRST_EXCEPTION`, and `ALL_COMPLETED` modes.
- For I/O-bound work, use `ThreadPoolExecutor` with a generous `max_workers` (e.g., 10-50). For CPU-bound work, use `ProcessPoolExecutor` with `max_workers=os.cpu_count()`.
- `future.cancel()` only succeeds if the task is still queued and hasn't been picked up by a worker yet.
- Use `asyncio.run_in_executor()` or `asyncio.to_thread()` to integrate `concurrent.futures` with async code.
