from dataclasses import dataclass

from .review_queue_item import ReviewQueueItemVM


@dataclass
class ReviewQueueVM:
    items: list[ReviewQueueItemVM]
    empty: bool