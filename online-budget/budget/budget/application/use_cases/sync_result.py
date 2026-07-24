from dataclasses import dataclass


@dataclass
class SyncResult:
    new_count: int
    skipped_count: int
    errors: list