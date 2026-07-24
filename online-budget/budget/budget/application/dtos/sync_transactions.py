from dataclasses import dataclass
from datetime import date


@dataclass
class SyncTransactionsDto:
    sync_since: date