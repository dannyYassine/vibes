from decimal import Decimal

from budget.budget.application.ports import CategoryRepository, TransactionRepository
from budget.budget.domain.entities import CategoryTotal, MonthlySummary
from budget.budget.domain.value_objects import Money


class SummaryService:
    def __init__(self, tx_repo: TransactionRepository, cat_repo: CategoryRepository):
        self._tx_repo = tx_repo
        self._cat_repo = cat_repo

    def build(self, year: int, month: int) -> MonthlySummary:
        txs = self._tx_repo.list_for_month(year, month)
        total_income = Money(
            sum((t.amount.amount for t in txs if t.amount.is_credit), Decimal("0")),
        )
        total_expense = Money(
            sum((-t.amount.amount for t in txs if not t.amount.is_credit), Decimal("0")),
        )
        by_cat: dict[int, Decimal] = {}
        for t in txs:
            if t.category is None:
                continue
            by_cat[t.category.id] = by_cat.get(t.category.id, Decimal("0")) + t.amount.amount
        totals = []
        denom = total_income.amount + abs(total_expense.amount) or Decimal("1")
        for cat in self._cat_repo.list_all():
            amt = by_cat.get(cat.id, Decimal("0"))
            totals.append(CategoryTotal(
                category=cat, amount=Money(amt),
                percentage=Decimal("0") if denom == 0 else (abs(amt) / denom * 100),
            ))
        return MonthlySummary(
            year=year, month=month, total_income=total_income,
            total_expense=total_expense, categories=totals,
        )