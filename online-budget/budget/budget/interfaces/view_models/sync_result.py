from dataclasses import dataclass


@dataclass
class SyncResultVM:
    new_count: int
    skipped_count: int
    errors: list
    message: str