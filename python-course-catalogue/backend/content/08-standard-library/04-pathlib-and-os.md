---
title: "Pathlib and File System Operations"
description: "Navigate the file system with pathlib's object-oriented Path API."
duration_minutes: 25
order: 4
---

## Overview

For years, Python file system work meant juggling strings with `os.path`. `pathlib` (introduced in Python 3.4, idiomatic since 3.6) replaces that with a clean object-oriented API. Paths become objects with methods, not raw strings you pass to scattered functions. The result is more readable, more robust, and cross-platform by default.

---

## Why pathlib Over os.path

```python
# os.path style — fragile string juggling
import os

config_path = os.path.join(os.path.expanduser("~"), ".config", "myapp", "settings.json")
if os.path.exists(config_path) and os.path.isfile(config_path):
    with open(config_path) as f:
        data = f.read()

# pathlib style — readable and OOP
from pathlib import Path

config_path = Path.home() / ".config" / "myapp" / "settings.json"
if config_path.is_file():
    data = config_path.read_text(encoding="utf-8")
```

Key advantages:
- **`/` operator** composes paths naturally — works on Windows too (no `\\` vs `/` confusion)
- **Methods on the object** — `.exists()`, `.read_text()`, `.glob()` are on the path itself
- **Rich attributes** — `.name`, `.stem`, `.suffix`, `.parent` without helper functions
- **Automatic cross-platform** — `Path` resolves to `WindowsPath` or `PosixPath` at runtime

---

## Constructing Paths

```python
from pathlib import Path

# From string
p = Path("/usr/local/bin/python3")

# Home directory and cwd
home = Path.home()          # e.g. PosixPath('/Users/alice')
cwd  = Path.cwd()           # current working directory

# Composing with /
project    = Path("/Users/alice/projects/myapp")
src_dir    = project / "src"
main_file  = project / "src" / "main.py"
config     = project / "config" / "settings.json"

print(main_file)   # /Users/alice/projects/myapp/src/main.py

# Resolving relative paths to absolute
relative = Path("../sibling/file.txt")
absolute = relative.resolve()   # resolves . and .. against cwd

# Path from environment variable
import os
log_dir = Path(os.environ.get("LOG_DIR", "/var/log/myapp"))
```

---

## Querying Path Properties

```python
from pathlib import Path
import time

p = Path("/Users/alice/projects/myapp/src/main.py")

# Existence and type
print(p.exists())     # True/False
print(p.is_file())    # True if file exists
print(p.is_dir())     # True if directory exists
print(p.is_symlink()) # True if symbolic link

# Name components
print(p.name)         # "main.py"
print(p.stem)         # "main"      (name without suffix)
print(p.suffix)       # ".py"       (last extension)
print(p.suffixes)     # [".py"]     (all extensions, e.g. [".tar", ".gz"])
print(p.parent)       # /Users/alice/projects/myapp/src
print(p.parents[0])   # /Users/alice/projects/myapp/src
print(p.parents[1])   # /Users/alice/projects/myapp
print(p.parts)        # ('/', 'Users', 'alice', 'projects', 'myapp', 'src', 'main.py')

# Stat info
stat = p.stat()
print(stat.st_size)                                # file size in bytes
print(time.ctime(stat.st_mtime))                   # last modified time
print(stat.st_mode)                                # permission bits

# Convenient size formatting
def human_size(path: Path) -> str:
    size = path.stat().st_size
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} TB"

# Changing name components
p2 = p.with_name("config.py")       # /Users/.../src/config.py
p3 = p.with_stem("app")             # /Users/.../src/app.py   (Python 3.9+)
p4 = p.with_suffix(".pyi")          # /Users/.../src/main.pyi
```

---

## Reading and Writing Files

```python
from pathlib import Path

p = Path("/tmp/example.txt")

# Text I/O — always specify encoding
p.write_text("Hello, World!\nLine 2\n", encoding="utf-8")
content = p.read_text(encoding="utf-8")
print(content)

# Binary I/O
p.write_bytes(b"\x89PNG\r\n\x1a\n")   # write raw bytes
data = p.read_bytes()                  # read raw bytes

# For large files, use open() as usual
with p.open("a", encoding="utf-8") as f:    # append mode
    f.write("Another line\n")

with p.open("r", encoding="utf-8") as f:
    for line in f:
        print(line.rstrip())
```

---

## Directory Operations

```python
from pathlib import Path

base = Path("/tmp/my_project")

# Create directories
base.mkdir(parents=True, exist_ok=True)
# parents=True: creates intermediate directories (like mkdir -p)
# exist_ok=True: no error if directory already exists

(base / "logs").mkdir(exist_ok=True)
(base / "data" / "raw").mkdir(parents=True, exist_ok=True)

# List directory contents
for item in base.iterdir():
    kind = "dir" if item.is_dir() else "file"
    print(f"  {kind}: {item.name}")

# Glob — one level
py_files = list(base.glob("*.py"))                # .py files in base only
json_files = list(base.glob("**/*.json"))          # same as rglob

# rglob — recursive glob
all_md = list(base.rglob("*.md"))                  # all .md files recursively
all_py = sorted(base.rglob("*.py"), key=lambda p: p.stat().st_size, reverse=True)

# Remove a directory (must be empty)
empty_dir = base / "empty"
empty_dir.mkdir(exist_ok=True)
empty_dir.rmdir()
```

---

## File Operations

```python
from pathlib import Path

src = Path("/tmp/original.txt")
src.write_text("hello", encoding="utf-8")

# Rename (within same filesystem)
dst = src.with_name("renamed.txt")
src.rename(dst)                   # returns new Path

# Replace (overwrites destination if it exists)
Path("/tmp/a.txt").write_text("a", encoding="utf-8")
Path("/tmp/b.txt").write_text("b", encoding="utf-8")
Path("/tmp/a.txt").replace(Path("/tmp/b.txt"))   # b.txt now contains "a"

# Delete a file
p = Path("/tmp/to_delete.txt")
p.write_text("delete me", encoding="utf-8")
p.unlink()                         # raises FileNotFoundError if missing
p.unlink(missing_ok=True)          # Python 3.8+: no error if missing

# Symbolic links
link = Path("/tmp/my_link")
link.symlink_to(Path("/tmp/b.txt"))
print(link.resolve())              # resolves symlink to real path
link.unlink()
```

---

## Temporary Files with tempfile

```python
import tempfile
from pathlib import Path

# Temporary file — auto-deleted on context exit
with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=True, encoding="utf-8") as f:
    f.write("name,age\nAlice,30\n")
    f.flush()
    tmp_path = Path(f.name)
    print(f"Temp file: {tmp_path}")
    # File is accessible here
# File is deleted here

# For test fixtures: create, use, pass path around
with tempfile.NamedTemporaryFile(
    mode="wb", suffix=".db", delete=False  # delete=False keeps it after close
) as f:
    db_path = Path(f.name)

try:
    # Use db_path for SQLite or other work
    pass
finally:
    db_path.unlink(missing_ok=True)

# Temporary directory — entire tree auto-deleted
with tempfile.TemporaryDirectory() as tmp_dir:
    base = Path(tmp_dir)
    (base / "config.json").write_text('{"debug": true}', encoding="utf-8")
    (base / "data").mkdir()
    (base / "data" / "output.csv").write_text("x,y\n1,2\n", encoding="utf-8")
    # Process files...
    print(list(base.rglob("*")))
# Entire directory tree is deleted here
```

---

## os Module Essentials

Despite `pathlib`'s superiority for path manipulation, `os` still has things you need:

```python
import os

# Environment variables
db_url    = os.environ["DATABASE_URL"]             # raises KeyError if missing
debug     = os.environ.get("DEBUG", "false")       # safe default
port      = int(os.environ.get("PORT", "8000"))

# All env vars as a dict-like object
for key, value in os.environ.items():
    if key.startswith("APP_"):
        print(f"{key} = {value}")

# Current directory
print(os.getcwd())          # same as str(Path.cwd())
os.chdir("/tmp")            # change working directory (avoid in production code)

# Directory listing (returns names, not Paths)
names = os.listdir("/tmp")

# Recursive walk — yields (dirpath, dirnames, filenames) tuples
for dirpath, dirnames, filenames in os.walk("/Users/alice/projects"):
    # Prune hidden directories in-place
    dirnames[:] = [d for d in dirnames if not d.startswith(".")]
    for filename in filenames:
        full_path = os.path.join(dirpath, filename)
        print(full_path)
```

---

## shutil — High-Level File Operations

```python
import shutil
from pathlib import Path

src = Path("/tmp/source_file.txt")
src.write_text("content", encoding="utf-8")

# Copy file (with metadata)
dst = Path("/tmp/dest_file.txt")
shutil.copy2(src, dst)          # copy2 preserves timestamps; copy() doesn't

# Copy entire directory tree
src_dir = Path("/tmp/source_dir")
src_dir.mkdir(exist_ok=True)
(src_dir / "file.txt").write_text("hello", encoding="utf-8")

dst_dir = Path("/tmp/dest_dir")
shutil.copytree(src_dir, dst_dir)         # dst_dir must not exist
shutil.copytree(src_dir, dst_dir, dirs_exist_ok=True)  # Python 3.8+

# Move file or directory
shutil.move(str(src), str(Path("/tmp/moved_file.txt")))

# Delete entire directory tree
shutil.rmtree("/tmp/dest_dir")            # dangerous — no undo!
shutil.rmtree("/tmp/dest_dir", ignore_errors=True)  # silent if missing

# Disk usage
usage = shutil.disk_usage("/")
print(f"Total: {usage.total / 1e9:.1f} GB")
print(f"Used:  {usage.used  / 1e9:.1f} GB")
print(f"Free:  {usage.free  / 1e9:.1f} GB")

# Find executable on PATH
python_path = shutil.which("python3")
print(python_path)   # e.g. /usr/bin/python3
```

---

## Real Example: Walk a Project, Report .py File Sizes

```python
from pathlib import Path

def report_python_files(root: str | Path, top_n: int = 10) -> None:
    """
    Walk a project directory, find all .py files,
    and report the largest ones with human-readable sizes.
    """
    root = Path(root)
    if not root.is_dir():
        raise ValueError(f"{root} is not a directory")

    # Collect all .py files, skipping hidden dirs and __pycache__
    py_files = []
    for path in root.rglob("*.py"):
        # Skip hidden directories and __pycache__
        if any(part.startswith(".") or part == "__pycache__"
               for part in path.parts):
            continue
        py_files.append(path)

    if not py_files:
        print("No .py files found.")
        return

    # Sort by size descending
    py_files.sort(key=lambda p: p.stat().st_size, reverse=True)

    total_lines = 0
    total_bytes = 0

    print(f"\n{'Size':>10}  {'Lines':>6}  Path")
    print("-" * 60)

    for path in py_files[:top_n]:
        stat = path.stat()
        try:
            lines = len(path.read_text(encoding="utf-8", errors="replace").splitlines())
        except OSError:
            lines = -1

        total_lines += max(lines, 0)
        total_bytes += stat.st_size

        size_str = f"{stat.st_size:,}"
        rel = path.relative_to(root)
        print(f"{size_str:>10}  {lines:>6}  {rel}")

    print("-" * 60)
    print(f"{'Total .py files:':30} {len(py_files)}")
    print(f"{'Total bytes:':30} {total_bytes:,}")
    print(f"{'Total lines (top {top_n}):':30} {total_lines:,}")

# Run it:
# report_python_files("/Users/alice/projects/myapp")
```

---

## Key Takeaways

- **Use `pathlib.Path`** for all new code. It is more readable, safer, and cross-platform than `os.path` string operations.
- **`/` operator** composes paths without `os.path.join`. Treat it as essential syntax.
- **`.read_text()` / `.write_text()`** with explicit `encoding="utf-8"` are the cleanest way to handle small files. Use `open()` for large files or streaming.
- **`.glob()` and `.rglob()`** replace manual recursive `os.walk` traversals in most cases.
- **`tempfile.TemporaryDirectory()`** as a context manager is the cleanest way to create and auto-clean scratch space in tests or data pipelines.
- **`shutil.rmtree()`** is irreversible — always double-check the path before calling it. Consider adding a guard like `assert "production" not in str(path)` in critical scripts.
- **`os.walk()`** with in-place pruning of `dirnames` is still the most efficient way to do filtered recursive traversal when you need fine-grained control.
- **`os.environ`** is the right way to read configuration from the environment — always provide defaults with `.get()` unless the variable is truly required.
