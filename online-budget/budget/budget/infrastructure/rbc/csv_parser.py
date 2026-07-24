import csv
from pathlib import Path

from budget.budget.domain.exceptions import SyncFailed

EXPECTED_HEADERS = {"Transaction Date", "Description 1", "CAD$"}


def parse_csv(path: Path) -> list[dict]:
    if not path.exists():
        raise SyncFailed(f"CSV not found: {path}")
    rows = []
    with open(path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        headers = set(reader.fieldnames or [])
        missing = EXPECTED_HEADERS - headers
        if missing:
            raise SyncFailed(f"RBC CSV schema changed — missing columns: {sorted(missing)}")
        for r in reader:
            desc = (r.get("Description 1") or "").strip()
            if r.get("Description 2"):
                desc += " " + r["Description 2"].strip()
            date_raw = (r.get("Transaction Date") or "").strip()
            amount = (r.get("CAD$") or "").strip()
            if not date_raw or not amount:
                continue
            rows.append({
                "rbc_transaction_id": f"{date_raw}|{desc}|{amount}",
                "posted_date": _normalize_date(date_raw),
                "description_raw": desc,
                "amount_str": amount,
            })
    return rows


def _normalize_date(raw: str) -> str:
    from datetime import datetime
    try:
        return datetime.strptime(raw, "%m/%d/%Y").date().isoformat()
    except ValueError:
        return raw