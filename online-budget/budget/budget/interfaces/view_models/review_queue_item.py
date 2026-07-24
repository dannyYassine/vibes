from dataclasses import dataclass

from .category_option import CategoryOptionVM


@dataclass
class ReviewQueueItemVM:
    transaction_id: int
    description: str
    amount: str
    date: str
    category_options: list[CategoryOptionVM]