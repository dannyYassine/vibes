---
type: Reference
title: CSV Parser
description: Parses RBC-exported CSV transaction files into the standard raw dict format.
tags: [csv, parser, rbc, reference]
timestamp: 2026-07-23T12:00:00Z
---

# CSV Parser

## Source
`budget/budget/infrastructure/rbc/csv_parser.py`

## Expected Headers
- `Transaction Date`
- `Description 1`
- `CAD$`

## Output Format
```python
{
    "rbc_transaction_id": str,  # "{date}|{desc}|{amount}" — dedup key
    "posted_date": str,         # ISO YYYY-MM-DD
    "description_raw": str,     # Description 1 + Description 2 (if present)
    "amount_str": str,          # Raw CAD$ value string
}
```

## Key Design
- Schema validation: raises `SyncFailed` if expected columns missing
- Dedup key derived from date + description + amount (3-way collision guard)
- Date format: `%m/%d/%Y` → ISO 8601
- BOM-aware: opens with `utf-8-sig` encoding