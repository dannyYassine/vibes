---
title: "Working with Dates and Times"
description: "Handle dates, times, timezones, and formatting with the datetime module."
duration_minutes: 20
order: 5
---

## Overview

Date and time handling is deceptively tricky. Python's `datetime` module provides the core building blocks — `date`, `time`, `datetime`, `timedelta`, and `timezone`. Python 3.9 added `zoneinfo` for full timezone support. Mishandling timezones is one of the most common sources of bugs in production systems — this lesson will help you avoid them.

---

## Core Classes at a Glance

| Class | What it represents |
|---|---|
| `date` | A calendar date: year, month, day |
| `time` | A time of day: hour, minute, second, microsecond |
| `datetime` | Combined date + time |
| `timedelta` | A duration (difference between two datetimes) |
| `timezone` | A fixed UTC offset timezone |

```python
from datetime import date, time, datetime, timedelta, timezone
```

---

## Creating Dates and Times

```python
from datetime import date, time, datetime, timezone

# Today's date
today = date.today()
print(today)               # 2024-06-15

# Current datetime (local time, naive — no timezone info)
now_local = datetime.now()
print(now_local)           # 2024-06-15 14:32:10.123456

# Timezone-aware current datetime — PREFER THIS
now_utc = datetime.now(tz=timezone.utc)
print(now_utc)             # 2024-06-15 19:32:10.123456+00:00

# datetime.utcnow() — DEPRECATED in Python 3.12
# It returns naive UTC, which is confusing. Use datetime.now(tz=timezone.utc) instead.
# bad = datetime.utcnow()

# Explicit construction
d  = date(2024, 6, 15)
t  = time(14, 30, 0)
dt = datetime(2024, 6, 15, 14, 30, 0)
dt_aware = datetime(2024, 6, 15, 14, 30, 0, tzinfo=timezone.utc)

# datetime.today() — same as datetime.now() without tz arg
# Use datetime.now(tz=...) for clarity
```

---

## Parsing: String to datetime

```python
from datetime import datetime, date

# ISO 8601 format — preferred
dt = datetime.fromisoformat("2024-06-15T14:30:00")
print(dt)    # 2024-06-15 14:30:00

# With timezone offset
dt = datetime.fromisoformat("2024-06-15T14:30:00+05:30")
print(dt)    # 2024-06-15 14:30:00+05:30

# Date-only ISO string
d = date.fromisoformat("2024-06-15")
print(d)     # 2024-06-15

# Custom format with strptime
dt = datetime.strptime("15/06/2024 14:30:00", "%d/%m/%Y %H:%M:%S")
print(dt)    # 2024-06-15 14:30:00

dt = datetime.strptime("June 15, 2024 2:30 PM", "%B %d, %Y %I:%M %p")
print(dt)    # 2024-06-15 14:30:00

# Common log format
dt = datetime.strptime("2024-06-15 14:30:00,123", "%Y-%m-%d %H:%M:%S,%f")
```

---

## Formatting: datetime to String

```python
from datetime import datetime, timezone

now = datetime.now(tz=timezone.utc)

# strftime format codes
print(now.strftime("%Y-%m-%d"))               # 2024-06-15
print(now.strftime("%d/%m/%Y"))               # 15/06/2024
print(now.strftime("%B %d, %Y"))              # June 15, 2024
print(now.strftime("%H:%M:%S"))               # 14:32:10
print(now.strftime("%I:%M %p"))               # 02:32 PM
print(now.strftime("%Y-%m-%dT%H:%M:%S%z"))   # 2024-06-15T14:32:10+0000

# Common format codes:
# %Y  - 4-digit year (2024)
# %m  - zero-padded month (06)
# %d  - zero-padded day (15)
# %H  - 24-hour hour (14)
# %I  - 12-hour hour (02)
# %M  - minutes (32)
# %S  - seconds (10)
# %f  - microseconds (123456)
# %p  - AM/PM
# %Z  - timezone abbreviation (UTC, EST)
# %z  - UTC offset (+0000, -0500)
# %A  - full weekday name (Saturday)
# %a  - abbreviated weekday (Sat)
# %B  - full month name (June)
# %b  - abbreviated month (Jun)

# ISO format shortcut
print(now.isoformat())    # 2024-06-15T14:32:10.123456+00:00
```

---

## Arithmetic with timedelta

```python
from datetime import datetime, timedelta, timezone

now = datetime.now(tz=timezone.utc)

# Creating timedeltas
one_week   = timedelta(weeks=1)
three_days = timedelta(days=3)
two_hours  = timedelta(hours=2)
mixed      = timedelta(days=1, hours=6, minutes=30, seconds=15)

# Adding to a datetime
next_week      = now + one_week
yesterday      = now - timedelta(days=1)
thirty_days    = now + timedelta(days=30)
in_90_minutes  = now + timedelta(minutes=90)

print(f"30 days from now: {thirty_days.date()}")

# Subtracting two datetimes gives a timedelta
then = datetime(2024, 1, 1, tzinfo=timezone.utc)
diff = now - then
print(f"Days since Jan 1: {diff.days}")
print(f"Total seconds:    {diff.total_seconds():.0f}")

# timedelta attributes
td = timedelta(days=2, hours=3, minutes=45)
print(td.days)           # 2
print(td.seconds)        # 13500  (hours*3600 + minutes*60, NOT total)
print(td.total_seconds()) # 186900.0  (USE THIS for total duration)

# Common pitfall: td.seconds only gives the seconds component of the day
# td.total_seconds() gives the full duration in seconds
wrong = timedelta(days=1, hours=2).seconds       # 7200 (only hour component!)
right = timedelta(days=1, hours=2).total_seconds()  # 93600.0
```

---

## Timezone-Aware vs Naive: The Critical Distinction

This is where most datetime bugs originate.

**Naive datetime**: no timezone info — Python does not know what timezone it represents.

**Aware datetime**: has `tzinfo` — represents an unambiguous point in time.

```python
from datetime import datetime, timezone

naive = datetime(2024, 6, 15, 14, 30, 0)
aware = datetime(2024, 6, 15, 14, 30, 0, tzinfo=timezone.utc)

print(naive.tzinfo)   # None
print(aware.tzinfo)   # UTC

# You CANNOT mix naive and aware datetimes
try:
    diff = aware - naive   # raises TypeError
except TypeError as e:
    print(e)   # can't subtract offset-naive and offset-aware datetimes
```

### The Bug This Causes

```python
import os
from datetime import datetime, timezone

# Storing naive datetimes from different sources
created_at = datetime.now()           # local time, naive
updated_at = datetime.utcnow()        # UTC time, naive — but looks the same type!

# If your local timezone is UTC-5, these two naive datetimes
# represent different instants, but Python can't tell:
diff = updated_at - created_at       # WRONG by 5 hours, no error raised

# Correct approach: always use aware datetimes
created_at = datetime.now(tz=timezone.utc)
updated_at = datetime.now(tz=timezone.utc)
diff = updated_at - created_at       # correct
```

**Rule**: Store all datetimes in UTC. Convert to local time only for display.

---

## zoneinfo — Full Timezone Support (Python 3.9+)

`timezone` only supports fixed UTC offsets. For named timezones with DST rules, use `zoneinfo`:

```python
from datetime import datetime
from zoneinfo import ZoneInfo

# Create aware datetime in a named timezone
eastern = ZoneInfo("America/New_York")
pacific = ZoneInfo("America/Los_Angeles")
tokyo   = ZoneInfo("Asia/Tokyo")

# Current time in different zones
now_utc     = datetime.now(tz=ZoneInfo("UTC"))
now_eastern = now_utc.astimezone(eastern)
now_tokyo   = now_utc.astimezone(tokyo)

print(now_utc)      # 2024-06-15 19:30:00+00:00
print(now_eastern)  # 2024-06-15 15:30:00-04:00  (EDT, not EST)
print(now_tokyo)    # 2024-06-16 04:30:00+09:00

# Attach timezone to a naive datetime (use replace(), NOT astimezone())
naive = datetime(2024, 6, 15, 10, 0, 0)
aware = naive.replace(tzinfo=eastern)   # 10:00 AM IS Eastern
# naive.astimezone(eastern) would convert FROM local — often wrong

# DST is handled automatically
winter = datetime(2024, 1, 15, 12, 0, tzinfo=eastern)
summer = datetime(2024, 7, 15, 12, 0, tzinfo=eastern)
print(winter)  # 2024-01-15 12:00:00-05:00  (EST, -5)
print(summer)  # 2024-07-15 12:00:00-04:00  (EDT, -4)
```

On systems without the IANA timezone database, install `tzdata`:
```bash
pip install tzdata
```

---

## pytz (Legacy)

Before `zoneinfo`, `pytz` was the standard. You will encounter it in older codebases:

```python
import pytz
from datetime import datetime

utc = pytz.utc
eastern = pytz.timezone("America/New_York")

# Localize a naive datetime (DON'T use replace() with pytz)
naive = datetime(2024, 6, 15, 10, 0, 0)
aware = eastern.localize(naive)       # correct with pytz

# Convert between zones
utc_time = aware.astimezone(utc)
print(utc_time)

# normalize() corrects DST after arithmetic (unique pytz issue)
from datetime import timedelta
result = eastern.normalize(aware + timedelta(hours=24))
```

Use `zoneinfo` for new code. Use `pytz` only when maintaining legacy code or when `tzdata` is unavailable.

---

## Unix Timestamps

```python
from datetime import datetime, timezone
import time

# Current Unix timestamp (seconds since epoch)
ts = time.time()
print(ts)    # e.g. 1718479800.123456

# datetime from Unix timestamp (always UTC-aware)
dt = datetime.fromtimestamp(ts, tz=timezone.utc)
print(dt)    # 2024-06-15 19:30:00.123456+00:00

# datetime to Unix timestamp
dt = datetime(2024, 6, 15, 19, 30, 0, tzinfo=timezone.utc)
ts = dt.timestamp()
print(ts)    # 1718479800.0

# For naive datetimes, .timestamp() assumes local time — be careful
naive = datetime(2024, 6, 15, 19, 30, 0)
ts_maybe_wrong = naive.timestamp()   # depends on system timezone
```

---

## calendar Module

```python
import calendar

# Is it a leap year?
print(calendar.isleap(2024))    # True
print(calendar.isleap(2023))    # False

# Days in a month
year, month = 2024, 2
weekday_of_first, days_in_month = calendar.monthrange(year, month)
print(days_in_month)   # 29 (leap year)

# Weekday constants
print(calendar.MONDAY)    # 0
print(calendar.SUNDAY)    # 6

# Print a text calendar
print(calendar.month(2024, 6))
```

---

## Real Examples

### Calculating Age from Birthdate

```python
from datetime import date

def calculate_age(birthdate: date) -> int:
    today = date.today()
    age = today.year - birthdate.year
    # Subtract 1 if birthday hasn't occurred yet this year
    if (today.month, today.day) < (birthdate.month, birthdate.day):
        age -= 1
    return age

print(calculate_age(date(1990, 12, 25)))  # 33 (as of mid-2024)
```

### "In 30 Days" Scheduling

```python
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

def schedule_in_days(days: int, tz: str = "UTC") -> datetime:
    """Return a timezone-aware datetime N days from now."""
    zone = ZoneInfo(tz)
    return datetime.now(tz=zone) + timedelta(days=days)

reminder = schedule_in_days(30, tz="America/Chicago")
print(f"Reminder set for: {reminder.strftime('%B %d, %Y at %I:%M %p %Z')}")
```

### Log Timestamps in UTC

```python
from datetime import datetime, timezone

def utc_now_iso() -> str:
    """Return current UTC time as ISO 8601 string for logging."""
    return datetime.now(tz=timezone.utc).isoformat()

# In a log record:
print(f"[{utc_now_iso()}] Request processed successfully")
# [2024-06-15T19:32:10.123456+00:00] Request processed successfully
```

---

## Key Takeaways

- **Prefer aware datetimes** over naive. Always attach timezone info when creating datetimes that cross system boundaries.
- **Store UTC, display local.** Store all timestamps as UTC in your database. Convert to the user's timezone only at the presentation layer.
- **`datetime.utcnow()` is deprecated** in Python 3.12. Use `datetime.now(tz=timezone.utc)` instead — it returns an aware datetime.
- **`zoneinfo`** (Python 3.9+) handles DST correctly with IANA timezone names. Prefer it over `pytz` for new code.
- **`timedelta.total_seconds()`** gives the full duration. `timedelta.seconds` gives only the sub-day seconds component — a common source of bugs.
- **`datetime.fromisoformat()`** is the simplest parser for standard ISO 8601 strings. Use `strptime` for custom formats.
- **Never mix naive and aware datetimes** in arithmetic — Python raises `TypeError`, which is the right behavior.
