from dataclasses import dataclass


@dataclass
class ApproveCategorizationDto:
    transaction_id: int
    category_id: int