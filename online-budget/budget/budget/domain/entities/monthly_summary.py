from dataclasses import dataclass

from ..value_objects import Money


@dataclass
class MonthlySummary:
    year: int
    month: int
    total_income: Money
    total_expense: Money
    categories: list