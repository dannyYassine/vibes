from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from .value_objects import Money


@dataclass
class Category:
    id: int | None = None
    name: str = ""
    color: str = "#999999"

    @classmethod
    def fromDatabase(cls, row) -> "Category":
        return cls(id=row.id, name=row.name, color=row.color)


@dataclass
class CategoryRule:
    id: int | None = None
    match_key: str = ""
    category_id: int = 0
    times_confirmed: int = 0

    @classmethod
    def fromDatabase(cls, row) -> "CategoryRule":
        return cls(
            id=row.id,
            match_key=row.match_key,
            category_id=row.category_id,
            times_confirmed=row.times_confirmed,
        )


@dataclass
class Transaction:
    id: int | None = None
    rbc_transaction_id: str = ""
    posted_date: date = None
    description_raw: str = ""
    description_normalized: str = ""
    amount: Money = field(default_factory=lambda: Money(Decimal("0")))
    category: Category | None = None
    categorization_status: str = "pending"   # "auto" | "manual" | "pending"
    approved_at: str | None = None

    @classmethod
    def fromDatabase(cls, row) -> "Transaction":
        return cls(
            id=row.id,
            rbc_transaction_id=row.rbc_transaction_id,
            posted_date=row.posted_date,
            description_raw=row.description_raw,
            description_normalized=row.description_normalized,
            amount=Money(row.amount),
            category=Category.fromDatabase(row.category) if row.category_id else None,
            categorization_status=row.categorization_status,
            approved_at=row.approved_at.isoformat() if row.approved_at else None,
        )


@dataclass
class MonthlySummary:
    year: int
    month: int
    total_income: Money
    total_expense: Money
    categories: list  # list[CategoryTotal]


@dataclass
class CategoryTotal:
    category: Category
    amount: Money
    percentage: Decimal