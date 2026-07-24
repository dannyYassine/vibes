from dataclasses import dataclass

from .category_total import CategoryTotalVM


@dataclass
class MonthlySummaryVM:
    month_label: str
    total_income: str
    total_expense: str
    net: str
    categories: list[CategoryTotalVM]