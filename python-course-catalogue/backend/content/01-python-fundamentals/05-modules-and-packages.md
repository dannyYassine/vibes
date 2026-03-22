---
title: "Modules and Packages"
description: "Organize code into reusable modules and understand Python's import system."
duration_minutes: 20
order: 5
---

## What are Modules?

A module is simply a Python file. Modules help organize code into logical units.

```python
# math_utils.py
def add(a, b):
    return a + b

def multiply(a, b):
    return a * b

PI = 3.14159
```

## Importing Modules

### Basic Import

```python
# Import entire module
import math_utils

result = math_utils.add(2, 3)
print(math_utils.PI)
```

### Import Specific Items

```python
# Import specific functions/variables
from math_utils import add, PI

result = add(2, 3)
print(PI)
```

### Import with Alias

```python
# Rename on import
import math_utils as mu
from math_utils import multiply as mult

result = mu.add(2, 3)
product = mult(4, 5)
```

### Import All (Use Sparingly)

```python
from math_utils import *  # Imports all public names
# Not recommended - pollutes namespace
```

## Packages

A package is a directory containing modules and an `__init__.py` file.

```
mypackage/
├── __init__.py
├── module_a.py
├── module_b.py
└── subpackage/
    ├── __init__.py
    └── module_c.py
```

### Using Packages

```python
# Import from package
from mypackage import module_a
from mypackage.module_b import some_function
from mypackage.subpackage import module_c
```

### The `__init__.py` File

Controls what's exported when the package is imported:

```python
# mypackage/__init__.py
from .module_a import func_a
from .module_b import func_b

__all__ = ["func_a", "func_b"]  # Controls `from package import *`
```

## Standard Library Highlights

Python includes many useful built-in modules:

```python
# os - Operating system interface
import os
current_dir = os.getcwd()
os.makedirs("new_folder", exist_ok=True)

# sys - System-specific parameters
import sys
print(sys.version)
print(sys.path)  # Module search path

# datetime - Date and time
from datetime import datetime, timedelta
now = datetime.now()
tomorrow = now + timedelta(days=1)

# json - JSON encoding/decoding
import json
data = {"name": "Alice", "age": 30}
json_str = json.dumps(data)
parsed = json.loads(json_str)

# pathlib - Object-oriented paths
from pathlib import Path
path = Path("data") / "file.txt"
if path.exists():
    content = path.read_text()

# collections - Specialized containers
from collections import Counter, defaultdict
counts = Counter(["a", "b", "a", "c", "a"])
# Counter({'a': 3, 'b': 1, 'c': 1})
```

## The `if __name__ == "__main__"` Pattern

Code that runs only when the file is executed directly:

```python
# calculator.py
def add(a, b):
    return a + b

def main():
    print("Running calculator")
    print(add(2, 3))

if __name__ == "__main__":
    main()
```

When imported: functions available, `main()` doesn't run.
When run directly: `main()` executes.

## Relative vs Absolute Imports

```python
# Inside mypackage/module_a.py

# Absolute import
from mypackage.module_b import something

# Relative import (preferred within packages)
from .module_b import something      # Same package
from ..other_package import other    # Parent package
```

## Virtual Environments

Isolate project dependencies:

```bash
# Create virtual environment
python -m venv .venv

# Activate it
source .venv/bin/activate  # macOS/Linux
.venv\Scripts\activate     # Windows

# Install packages
pip install requests

# Save dependencies
pip freeze > requirements.txt

# Install from requirements
pip install -r requirements.txt
```

## Key Takeaways

1. Modules are Python files; packages are directories with `__init__.py`
2. Use `import` for full module, `from ... import` for specific items
3. `__init__.py` controls package-level exports
4. Use `if __name__ == "__main__"` for runnable scripts
5. Virtual environments isolate project dependencies
6. The standard library provides many useful modules
