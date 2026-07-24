from dataclasses import dataclass


@dataclass
class CategoryTotalVM:
    name: str
    amount: str
    percentage: str
    badge_color: str