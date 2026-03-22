---
title: "Regular Expressions with re"
description: "Search, match, and transform text using Python's re module."
duration_minutes: 35
order: 6
---

## Overview

Regular expressions are a mini-language for describing text patterns. Python's `re` module provides full PCRE-like support. They are the right tool when you need flexible pattern matching — but knowing when to use them (and when not to) is equally important.

---

## When to Use Regex vs String Methods

Use **string methods** for exact, literal matches — they are faster and more readable:

```python
# Prefer string methods for literal operations
text = "Hello, World!"

text.startswith("Hello")     # starts with literal
text.endswith(".py")         # ends with literal
"error" in text              # membership test
text.replace("World", "Python")  # literal replacement
text.split(",")              # split on literal delimiter
text.strip()                 # strip whitespace
```

Use **regex** when you need:
- Variable patterns (digits, word boundaries, optional parts)
- Repeated or quantified structures
- Multiple alternatives
- Extraction of structured groups
- Complex substitutions

```python
import re

# String method can't do this cleanly:
re.fullmatch(r"\d{4}-\d{2}-\d{2}", "2024-06-15")   # validate date format
re.findall(r"\b\w+@\w+\.\w+\b", text)               # extract emails
re.sub(r"\s{2,}", " ", text)                         # collapse multiple spaces
```

---

## Metacharacters and What They Do

```
.     Any character except newline (use re.S / re.DOTALL to include newline)
^     Start of string (or start of line with re.M)
$     End of string (or end of line with re.M)
*     0 or more of the preceding element
+     1 or more of the preceding element
?     0 or 1 of the preceding element (also makes quantifiers lazy)
{n}   Exactly n repetitions
{n,}  n or more repetitions
{n,m} Between n and m repetitions (inclusive)
[]    Character class — matches one character from the set
\     Escape a metacharacter OR introduce a special sequence
|     Alternation — matches either left or right side
()    Grouping and capturing
```

---

## Character Classes

```python
import re

text = "Hello, World! 123 foo_bar"

# Built-in shorthand classes
re.findall(r"\d",  text)   # digits: ['1', '2', '3']
re.findall(r"\D",  text)   # non-digit characters
re.findall(r"\w",  text)   # word chars [a-zA-Z0-9_]: letters, digits, underscore
re.findall(r"\W",  text)   # non-word characters
re.findall(r"\s",  text)   # whitespace (space, tab, newline, etc.)
re.findall(r"\S",  text)   # non-whitespace

# Custom character classes with []
re.findall(r"[aeiou]",   text)       # vowels only
re.findall(r"[A-Z]",     text)       # uppercase letters
re.findall(r"[a-z0-9]",  text)       # lowercase + digits
re.findall(r"[^aeiou]",  text)       # ^ inside [] means NOT — consonants, digits, spaces, etc.
re.findall(r"[a-zA-Z]",  text)       # all letters

# Combining: word chars that are not digits
re.findall(r"[^\W\d]",   text)       # letters only (unicode-aware trick)
```

---

## Quantifiers: Greedy vs Lazy

By default, quantifiers are **greedy** — they match as much as possible while still allowing the overall pattern to match.

```python
import re

html = "<b>bold</b> and <i>italic</i>"

# Greedy: .* matches as much as possible
re.findall(r"<.*>", html)
# ['<b>bold</b> and <i>italic</i>']  — matches everything!

# Lazy: .*? matches as little as possible
re.findall(r"<.*?>", html)
# ['<b>', '</b>', '<i>', '</i>']  — each tag separately
```

```python
# Quantifier examples
pattern_tests = [
    (r"a*",    "aaa"),     # 0 or more: matches "aaa"
    (r"a+",    "aaa"),     # 1 or more: matches "aaa"
    (r"a?",    "a"),       # 0 or 1: matches "a"
    (r"a{3}",  "aaaaa"),   # exactly 3: matches "aaa"
    (r"a{2,}", "aaaaa"),   # 2 or more: matches "aaaaa"
    (r"a{2,4}","aaaaa"),   # 2 to 4: matches "aaaa"
    (r"a{2,4}?","aaaaa"),  # lazy 2 to 4: matches "aa"
]

for pattern, text in pattern_tests:
    m = re.search(pattern, text)
    print(f"{pattern!r:12} on {text!r}: {m.group()!r}")
```

---

## Groups: Capturing and Non-Capturing

```python
import re

text = "John Smith: 555-1234, Jane Doe: 555-5678"

# Capturing groups ()
m = re.search(r"(\w+)\s(\w+):\s(\d{3}-\d{4})", text)
if m:
    print(m.group(0))   # full match: "John Smith: 555-1234"
    print(m.group(1))   # "John"
    print(m.group(2))   # "Smith"
    print(m.group(3))   # "555-1234"
    print(m.groups())   # ('John', 'Smith', '555-1234')

# Non-capturing groups (?:...) — group without capturing
re.findall(r"(?:Mr|Mrs|Dr)\s(\w+)", "Dr Smith and Mrs Jones")
# ['Smith', 'Jones']  — only captures the name, not the title

# Named groups (?P<name>...)
pattern = r"(?P<first>\w+)\s(?P<last>\w+):\s(?P<phone>\d{3}-\d{4})"
m = re.search(pattern, text)
if m:
    print(m.group("first"))    # "John"
    print(m.group("last"))     # "Smith"
    print(m.group("phone"))    # "555-1234"
    print(m.groupdict())       # {'first': 'John', 'last': 'Smith', 'phone': '555-1234'}
```

---

## re.match, re.search, re.fullmatch

```python
import re

text = "2024-06-15: System started"

# re.match — anchored at the START of the string
m = re.match(r"\d{4}-\d{2}-\d{2}", text)
print(m.group() if m else None)   # "2024-06-15" (matches at start)

m = re.match(r"System", text)
print(m)   # None — "System" is not at position 0

# re.search — finds first occurrence ANYWHERE
m = re.search(r"System", text)
print(m.group() if m else None)   # "System"

# re.fullmatch — pattern must match the ENTIRE string
print(re.fullmatch(r"\d{4}-\d{2}-\d{2}", "2024-06-15"))   # Match object
print(re.fullmatch(r"\d{4}-\d{2}-\d{2}", "2024-06-15 extra"))  # None
```

---

## re.findall and re.finditer

```python
import re

text = "Order #1001 placed on 2024-06-01, Order #1002 placed on 2024-06-15"

# findall — returns list of strings (or list of tuples if groups)
orders = re.findall(r"#(\d+)", text)
print(orders)   # ['1001', '1002']

dates = re.findall(r"(\d{4})-(\d{2})-(\d{2})", text)
print(dates)    # [('2024', '06', '01'), ('2024', '06', '15')]

# finditer — returns iterator of Match objects (memory-efficient for large text)
for m in re.finditer(r"#(\d+)\s+placed on\s+(\d{4}-\d{2}-\d{2})", text):
    order_id = m.group(1)
    date_str = m.group(2)
    start, end = m.start(), m.end()
    print(f"Order {order_id} on {date_str} [chars {start}-{end}]")
```

---

## Match Object Methods

```python
import re

text = "  hello world  "
m = re.search(r"(\w+)\s+(\w+)", text.strip())

if m:
    print(m.group())        # "hello world"  (entire match)
    print(m.group(0))       # "hello world"  (same as group())
    print(m.group(1))       # "hello"
    print(m.group(2))       # "world"
    print(m.groups())       # ('hello', 'world')
    print(m.groupdict())    # {} (no named groups)
    print(m.start())        # 0
    print(m.end())          # 11
    print(m.span())         # (0, 11)
    print(m.start(1))       # 0  (start of group 1)
    print(m.end(2))         # 11 (end of group 2)
```

---

## re.sub — Substitution

```python
import re

# Basic replacement
text = "Hello   World   Python"
clean = re.sub(r"\s{2,}", " ", text)
print(clean)    # "Hello World Python"

# Backreferences in replacement string: \1, \2, etc.
dates = "June 15, 2024 and June 16, 2024"
iso = re.sub(
    r"(\w+)\s(\d+),\s(\d{4})",
    r"\3-\1-\2",   # year-month-day
    dates
)
# Note: this is illustrative; real date parsing needs strptime

# Named backreferences: \g<name>
ssn = "SSN: 123-45-6789"
masked = re.sub(
    r"(?P<area>\d{3})-(?P<group>\d{2})-(?P<serial>\d{4})",
    r"***-**-\g<serial>",
    ssn
)
print(masked)   # "SSN: ***-**-6789"

# Replacement can be a callable
def redact(m):
    return "*" * len(m.group())

email = "Contact us at admin@example.com or support@company.org"
redacted = re.sub(r"\w+@\w+\.\w+", redact, email)
print(redacted)
```

---

## re.split — Split by Pattern

```python
import re

# Split on any whitespace sequence
parts = re.split(r"\s+", "one  two\tthree\nfour")
print(parts)    # ['one', 'two', 'three', 'four']

# Split on delimiters, keeping separators (use capture group)
tokens = re.split(r"([,;])", "a,b;c,d")
print(tokens)   # ['a', ',', 'b', ';', 'c', ',', 'd']

# Limit the number of splits
parts = re.split(r"\s*,\s*", "one, two, three, four", maxsplit=2)
print(parts)    # ['one', 'two', 'three, four']
```

---

## Flags

```python
import re

# re.IGNORECASE (re.I) — case-insensitive matching
re.search(r"hello", "HELLO WORLD", re.I)      # matches
re.findall(r"[a-z]+", "Hello World", re.I)    # ['Hello', 'World']

# re.MULTILINE (re.M) — ^ and $ match start/end of each LINE
text = "first line\nsecond line\nthird line"
re.findall(r"^\w+", text, re.M)   # ['first', 'second', 'third']
re.findall(r"\w+$", text, re.M)   # ['line', 'line', 'line']

# re.DOTALL (re.S) — . matches newline too
re.search(r"start.*end", "start\nmiddle\nend", re.S).group()
# "start\nmiddle\nend"

# Combine flags with |
re.findall(r"hello.+world", "Hello\nWorld", re.I | re.S)

# Inline flags inside the pattern (useful in compiled patterns)
re.findall(r"(?i)hello", "HELLO hello Hello")   # all three
```

---

## Compiled Patterns

If you use the same pattern more than once, compile it. This parses the pattern once and reuses the compiled object:

```python
import re

# Without compilation — pattern parsed every call
for line in huge_log_file:
    if re.search(r"ERROR|CRITICAL", line, re.I):
        process(line)

# With compilation — faster and more readable
error_pattern = re.compile(r"ERROR|CRITICAL", re.I)
for line in huge_log_file:
    if error_pattern.search(line):
        process(line)

# Compiled pattern has the same methods
ip_pattern = re.compile(
    r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}"
    r"(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b"
)

text = "Server at 192.168.1.100 connected to 10.0.0.1"
ips = ip_pattern.findall(text)
print(ips)    # ['192.168.1.100', '10.0.0.1']
```

---

## Lookahead and Lookbehind Assertions

Lookarounds match a position, not characters — they do not consume input.

```python
import re

text = "price: $100 and €200 and £300"

# Positive lookahead (?=...) — match if followed by
re.findall(r"\d+(?=\s*€)", text)    # ['200']  — numbers followed by euro sign

# Negative lookahead (?!...) — match if NOT followed by
re.findall(r"\d+(?!\s*[€£])", text) # ['100'] roughly — numbers not followed by euro/pound

# Positive lookbehind (?<=...) — match if preceded by (fixed width only)
re.findall(r"(?<=\$)\d+", text)     # ['100']  — numbers after $
re.findall(r"(?<=€)\d*", text)      # not useful here — € is before

# Negative lookbehind (?<!...) — match if NOT preceded by
words = "unhappy unkind kind happy"
re.findall(r"(?<!un)\b\w+", words)  # words not preceded by "un"

# Real use: split on comma but not inside quotes
# (simplified approach with lookahead)
csv = "Smith, John, \"Doe, Jane\", Alice"
# For real CSV parsing, use the csv module instead
```

---

## Practical Patterns

### Email Validation

```python
import re

EMAIL_RE = re.compile(
    r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
)

def is_valid_email(email: str) -> bool:
    return bool(EMAIL_RE.fullmatch(email.strip()))

print(is_valid_email("user@example.com"))      # True
print(is_valid_email("user+tag@sub.co.uk"))    # True
print(is_valid_email("not-an-email"))          # False
print(is_valid_email("@missinglocal.com"))     # False
```

### URL Extraction

```python
import re

URL_RE = re.compile(
    r"https?://"                 # scheme
    r"(?:[-\w]+\.)+\w{2,}"      # domain
    r"(?:/[-\w._~:/?#\[\]@!$&'()*+,;=%]*)?"  # path and query
)

text = "Visit https://example.com/page?q=1 or http://docs.python.org for info."
urls = URL_RE.findall(text)
print(urls)
# ['https://example.com/page?q=1', 'http://docs.python.org']
```

### Phone Number Extraction

```python
import re

PHONE_RE = re.compile(
    r"(?:\+?1[\s.-]?)?"           # optional country code
    r"(?:\(?\d{3}\)?[\s.-]?)"     # area code
    r"\d{3}[\s.-]?\d{4}"          # number
)

text = "Call (555) 123-4567 or +1 800.555.0199 or 555-9876"
phones = PHONE_RE.findall(text)
print(phones)
# ['(555) 123-4567', '+1 800.555.0199', '555-9876']
```

### Log Parsing

```python
import re
from datetime import datetime

LOG_RE = re.compile(
    r"(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})"
    r"\s+(?P<level>DEBUG|INFO|WARNING|ERROR|CRITICAL)"
    r"\s+(?P<logger>\S+)"
    r"\s+(?P<message>.+)$"
)

sample_log = """\
2024-06-15 14:32:10 INFO     app.server Request received GET /api/users
2024-06-15 14:32:10 WARNING  app.db     Slow query: 2.3s for SELECT * FROM orders
2024-06-15 14:32:11 ERROR    app.auth   Invalid token from 192.168.1.50
"""

for line in sample_log.strip().splitlines():
    m = LOG_RE.match(line)
    if m:
        d = m.groupdict()
        print(f"[{d['level']}] {d['logger']}: {d['message'][:50]}")
```

---

## Pitfall: Catastrophic Backtracking

Some patterns on certain inputs cause exponential backtracking — the regex engine tries every possible combination of matches, bringing it to a halt.

```python
import re
import time

# DANGER: nested quantifiers with overlapping character classes
dangerous = re.compile(r"(a+)+b")

# On input "aaaaaaaaaaaaaaaaac" (no final 'b'), the engine backtracks
# through every permutation of how to distribute 'a's across the groups.
# Each extra 'a' roughly DOUBLES the work.

# Safe alternative: use atomic-group-like approach or possessive quantifiers
# Python's re does not support atomic groups — use the 'regex' third-party module
# Or restructure to avoid ambiguity

# SAFE: no overlap between quantifier and outer group
safe = re.compile(r"a+b")   # straightforward — no catastrophic backtracking

# Another common dangerous pattern: alternation with overlapping alternatives
# r"(x|xx)+y" on "xxxxxxy" is fine, but on "xxxxxx" catastrophically slow
# Fix: order alternatives longest-first and avoid overlap
```

### How to Spot Dangerous Patterns

Watch for:
1. Nested quantifiers where inner and outer groups match the same characters: `(a+)+`, `(\w+\s*)+`
2. Alternation where alternatives share a prefix: `(cat|catch)+`
3. Long strings of repetition with no required anchor

**Fix strategies:**
- Use possessive quantifiers or atomic groups (via `pip install regex`)
- Add anchors (`^`, `$`, `\b`) to reduce backtrack points
- Break into multiple simpler patterns
- For HTML/XML, use a parser (`html.parser`, `lxml`, `beautifulsoup4`) instead of regex

---

## Key Takeaways

- **Choose the right tool**: use string methods for literal operations; regex for structural patterns.
- **`re.compile()`** patterns that are used in loops or called frequently — it avoids re-parsing the pattern each time.
- **Always use raw strings** (`r"..."`) for regex patterns to avoid double-escaping backslashes.
- **`re.search()` vs `re.match()`**: `match` only checks the start; `search` scans the whole string. Use `re.fullmatch()` to match the entire string.
- **Named groups** (`(?P<name>...)`) make complex patterns self-documenting and make `m.groupdict()` usable.
- **Lazy quantifiers** (`*?`, `+?`) are essential when matching delimited content like HTML tags or quoted strings.
- **Lookarounds** assert context without consuming characters — powerful for context-sensitive extraction.
- **Catastrophic backtracking** can freeze your program. Avoid nested quantifiers over overlapping character classes.
- **For production use**: compile patterns at module level, document what they match, and add unit tests with both matching and non-matching examples.
