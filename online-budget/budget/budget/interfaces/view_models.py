from dataclasses import dataclass


@dataclass
class CategoryTotalVM:
    name: str
    amount: str
    percentage: str
    badge_color: str


@dataclass
class MonthlySummaryVM:
    month_label: str
    total_income: str
    total_expense: str
    net: str
    categories: list[CategoryTotalVM]


@dataclass
class CategoryOptionVM:
    id: int
    name: str


@dataclass
class ReviewQueueItemVM:
    transaction_id: int
    description: str
    amount: str
    date: str
    category_options: list[CategoryOptionVM]


@dataclass
class ReviewQueueVM:
    items: list[ReviewQueueItemVM]
    empty: bool


@dataclass
class SyncResultVM:
    new_count: int
    skipped_count: int
    errors: list
    message: str