from dataclasses import dataclass
from datetime import date


@dataclass
class SyncTransactionsDto:
    sync_since: date


@dataclass
class AutoCategorizeDto:
    pass


@dataclass
class ApproveCategorizationDto:
    transaction_id: int
    category_id: int


@dataclass
class GetMonthlySummaryDto:
    year: int
    month: int


@dataclass
class GetReviewQueueDto:
    pass