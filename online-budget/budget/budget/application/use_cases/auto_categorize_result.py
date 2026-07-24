from dataclasses import dataclass


@dataclass
class AutoCategorizeResult:
    auto_approved: int
    queued: int