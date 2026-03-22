---
title: "File I/O Basics"
description: "Read and write files in Python using context managers, text and binary modes."
duration_minutes: 20
order: 10
---

## File I/O Basics

Working with files is fundamental to almost every real Python program. Python's built-in `open()` function plus the standard library's `csv`, `json`, and `pathlib` modules cover the vast majority of file work you will ever need.

---

## open() and File Modes

`open(path, mode, encoding)` is the core function. The mode string controls whether you read, write, or append, and whether you work in text or binary mode.

| Mode | Meaning |
|------|---------|
| `"r"` | Read text (default). File must exist. |
| `"w"` | Write text. Creates file or **truncates** existing file. |
| `"a"` | Append text. Creates file if needed; never truncates. |
| `"x"` | Exclusive create. Raises `FileExistsError` if file already exists. |
| `"r+"` | Read and write. File must exist. |
| `"rb"` | Read binary. |
| `"wb"` | Write binary. |
| `"ab"` | Append binary. |

Always specify `encoding` for text modes. UTF-8 is the right default for new code:

```python
# The full signature
f = open("data.txt", mode="r", encoding="utf-8")
f.close()  # you MUST close — but don't write it this way
```

---

## Always Use `with open(...)` — Context Managers

The `with` statement guarantees the file is closed even if an exception is raised mid-read or mid-write.

```python
# BAD — if an exception occurs before f.close(), the file stays open
f = open("notes.txt", "r", encoding="utf-8")
content = f.read()
f.close()

# GOOD — file is ALWAYS closed when the with block exits
with open("notes.txt", "r", encoding="utf-8") as f:
    content = f.read()
# f is closed here — even if f.read() raised an exception

# Open multiple files at once
with open("input.txt", "r", encoding="utf-8") as fin, \
     open("output.txt", "w", encoding="utf-8") as fout:
    for line in fin:
        fout.write(line.upper())
```

Why it matters: on Linux/macOS there is a per-process limit on open file descriptors (typically 1024). If you open files in a loop without closing them you will eventually hit `OSError: Too many open files`.

---

## Reading Files

### read() — Entire File as One String

```python
with open("poem.txt", "r", encoding="utf-8") as f:
    content = f.read()
print(type(content))   # <class 'str'>
print(len(content))    # total number of characters

# read(n) — read at most n characters
with open("poem.txt", "r", encoding="utf-8") as f:
    first_100 = f.read(100)
    next_100  = f.read(100)   # continues from where we left off
```

### readline() — One Line at a Time

```python
with open("data.txt", "r", encoding="utf-8") as f:
    header = f.readline()      # first line (includes \n)
    second = f.readline()      # second line
    print(header.strip())
    print(second.strip())
```

### readlines() — All Lines as a List

```python
with open("data.txt", "r", encoding="utf-8") as f:
    lines = f.readlines()     # ['line1\n', 'line2\n', 'line3\n']

# Strip newlines in a comprehension
lines = [line.rstrip("\n") for line in lines]
```

### Iterating Line by Line (Memory Efficient)

For large files this is almost always the right approach. Python reads one line at a time — the entire file is never loaded into memory.

```python
# This is how you should read large files
total_bytes = 0
line_count = 0
with open("huge_logfile.txt", "r", encoding="utf-8") as f:
    for line in f:                      # lazy, line by line
        total_bytes += len(line.encode("utf-8"))
        line_count += 1

print(f"Lines: {line_count:,}")
print(f"Bytes: {total_bytes:,}")

# Real example: parse a log file
import re

error_pattern = re.compile(r"ERROR (\d{4}-\d{2}-\d{2}) (.+)")
errors = []

with open("app.log", "r", encoding="utf-8") as f:
    for line_num, line in enumerate(f, start=1):
        m = error_pattern.search(line)
        if m:
            errors.append({
                "line":    line_num,
                "date":    m.group(1),
                "message": m.group(2).strip(),
            })

print(f"Found {len(errors)} errors")
```

---

## Writing Files

```python
# write(str) — returns number of characters written
with open("output.txt", "w", encoding="utf-8") as f:
    n = f.write("Hello, World!\n")
    print(f"Wrote {n} characters")

# writelines(iterable) — writes each string without adding separators
lines = ["first line\n", "second line\n", "third line\n"]
with open("output.txt", "w", encoding="utf-8") as f:
    f.writelines(lines)   # you supply the \n!

# Append mode — adds to end of file
with open("log.txt", "a", encoding="utf-8") as f:
    f.write("2024-01-15 10:30:22 INFO Server started\n")

# Exclusive create — fails if file exists (safe writes)
import os
try:
    with open("unique_report.txt", "x", encoding="utf-8") as f:
        f.write("This file was created fresh.\n")
except FileExistsError:
    print("Report already exists — won't overwrite")

# flush() — force write to OS buffer (before close)
import sys
with open("progress.log", "a", encoding="utf-8") as f:
    for i in range(10):
        f.write(f"Step {i} complete\n")
        f.flush()   # ensure this is written even if we crash mid-loop
```

---

## Binary Files

Use binary mode when dealing with images, PDFs, audio, serialized data, or any non-text format.

```python
# Copy a binary file
with open("image.png", "rb") as src, open("image_copy.png", "wb") as dst:
    while chunk := src.read(8192):   # walrus operator — read in 8 KB chunks
        dst.write(chunk)

# struct.pack/unpack — read structured binary data
import struct

# Write a binary record: 4-byte int, 8-byte double, 10-byte padded string
with open("record.bin", "wb") as f:
    data = struct.pack(">I d 10s", 42, 3.14159, b"Alice     ")
    f.write(data)

# Read it back
with open("record.bin", "rb") as f:
    raw = f.read(struct.calcsize(">I d 10s"))
    record_id, value, name_bytes = struct.unpack(">I d 10s", raw)
    name = name_bytes.rstrip(b"\x00").decode("ascii")
    print(f"ID={record_id}, value={value:.5f}, name={name}")
    # ID=42, value=3.14159, name=Alice

# Read the first few bytes to detect file type (magic bytes)
def detect_file_type(path: str) -> str:
    signatures = {
        b"\x89PNG":   "PNG image",
        b"\xff\xd8\xff": "JPEG image",
        b"PK\x03\x04":  "ZIP archive",
        b"%PDF":         "PDF document",
    }
    with open(path, "rb") as f:
        header = f.read(4)
    for sig, name in signatures.items():
        if header.startswith(sig):
            return name
    return "Unknown"
```

---

## File Paths with os.path

```python
import os

# os.path.join — builds paths correctly for the current OS
# On Windows: uses \  — On macOS/Linux: uses /
base_dir = "/Users/alice/projects"
filename = "report.csv"
full_path = os.path.join(base_dir, "data", filename)
print(full_path)   # /Users/alice/projects/data/report.csv

# Useful path operations
path = "/Users/alice/documents/report_2024.csv"
print(os.path.dirname(path))    # /Users/alice/documents
print(os.path.basename(path))   # report_2024.csv
print(os.path.splitext(path))   # ('/Users/alice/documents/report_2024', '.csv')
print(os.path.exists(path))     # True/False
print(os.path.isfile(path))     # True if it's a file
print(os.path.isdir(path))      # True if it's a directory
print(os.path.getsize(path))    # size in bytes

# Get the directory of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))
data_path = os.path.join(script_dir, "data", "input.csv")
```

Note: `pathlib.Path` is the modern alternative (covered in a later lesson). It uses object-oriented path manipulation and is generally cleaner for new code.

---

## Error Handling

```python
import errno

def read_config(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        print(f"Config file not found: {path}")
        return ""
    except PermissionError:
        print(f"No permission to read: {path}")
        return ""
    except UnicodeDecodeError as e:
        print(f"File is not valid UTF-8: {e}")
        # Try fallback encoding
        try:
            with open(path, "r", encoding="latin-1") as f:
                return f.read()
        except Exception:
            return ""
    except OSError as e:
        print(f"OS error reading {path}: {e}")
        return ""

# Safe write with atomic replace pattern
import tempfile

def safe_write(path: str, content: str) -> None:
    """Write to a temp file first, then rename — prevents partial writes."""
    dir_name = os.path.dirname(os.path.abspath(path))
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=dir_name,
        delete=False,
        suffix=".tmp",
    ) as tmp:
        tmp.write(content)
        tmp_path = tmp.name
    os.replace(tmp_path, path)   # atomic on POSIX
```

---

## CSV Files with the csv Module

```python
import csv

# Writing CSV
employees = [
    {"name": "Alice", "department": "Engineering", "salary": 95000},
    {"name": "Bob",   "department": "Marketing",   "salary": 72000},
    {"name": "Carol", "department": "Engineering", "salary": 102000},
]

with open("employees.csv", "w", newline="", encoding="utf-8") as f:
    fieldnames = ["name", "department", "salary"]
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(employees)

# Reading CSV
with open("employees.csv", "r", newline="", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for row in reader:
        print(f"{row['name']:10} {row['department']:15} ${int(row['salary']):,}")

# Low-level csv.reader / csv.writer
with open("data.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
    writer.writerow(["id", "name", "score"])    # header
    writer.writerow([1, "Alice", 98.5])
    writer.writerow([2, 'Bob, Jr.', 85.0])      # comma in value — quoted automatically

# IMPORTANT: always use newline="" when opening CSV files
# Letting Python handle newlines causes \r\r\n on Windows
```

---

## JSON Files with the json Module

```python
import json

# Writing JSON — json.dump writes to file, json.dumps returns a string
config = {
    "version": "1.0",
    "features": ["auth", "logging", "metrics"],
    "database": {
        "host": "localhost",
        "port": 5432,
        "pool_size": 10,
    },
    "debug": False,
}

with open("config.json", "w", encoding="utf-8") as f:
    json.dump(config, f, indent=2, ensure_ascii=False)

# Reading JSON — json.load reads from file, json.loads parses a string
with open("config.json", "r", encoding="utf-8") as f:
    loaded = json.load(f)

print(loaded["database"]["host"])   # localhost
print(type(loaded["features"]))     # <class 'list'>

# Pretty-printing for debugging
print(json.dumps(config, indent=2))

# Custom serialization — json can't handle datetime by default
from datetime import datetime

class DateTimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

event = {"name": "deploy", "timestamp": datetime.now()}
print(json.dumps(event, cls=DateTimeEncoder))
# {"name": "deploy", "timestamp": "2024-01-15T10:30:00.123456"}
```

---

## Key Takeaways

- **Always use `with open(...) as f:`**. It guarantees the file is closed, even when exceptions occur.
- Text mode (`"r"`, `"w"`, `"a"`) requires an `encoding` parameter. Always specify `encoding="utf-8"` for new code.
- For large files, **iterate line by line** (`for line in f:`) instead of `f.read()` or `f.readlines()` — it keeps memory usage constant.
- Use `"x"` mode to create a file exclusively; it prevents accidental overwriting.
- Binary mode (`"rb"`, `"wb"`) is for non-text data. Always pass `newline=""` when opening CSV files.
- Catch `FileNotFoundError`, `PermissionError`, and `UnicodeDecodeError` separately — they require different recovery strategies.
- The `csv` module handles quoting and escaping for you. Never parse CSV manually with `split(",")`.
- `json.load(f)` / `json.dump(obj, f)` are your standard tools for config files and data exchange.
