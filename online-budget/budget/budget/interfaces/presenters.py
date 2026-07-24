from decimal import Decimal

from budget.budget.domain.entities import MonthlySummary, Transaction
from budget.budget.interfaces.view_models import (
    CategoryOptionVM,
    CategoryTotalVM,
    MonthlySummaryVM,
    ReviewQueueItemVM,
    ReviewQueueVM,
    SyncResultVM,
)


def _money(amount: Decimal) -> str:
    sign = "-" if amount < 0 else ""
    return f"{sign}${abs(amount):,.2f}"


class DashboardPresenter:
    def present(self, summary: MonthlySummary) -> MonthlySummaryVM:
        from calendar import month_name
        label = f"{month_name[summary.month]} {summary.year}"
        net = summary.total_income.amount + summary.total_expense.amount
        cats = [
            CategoryTotalVM(
                name=c.category.name,
                amount=_money(c.amount.amount),
                percentage=f"{c.percentage:.1f}%",
                badge_color=c.category.color,
            )
            for c in summary.categories if c.amount.amount != 0
        ]
        return MonthlySummaryVM(
            month_label=label,
            total_income=_money(summary.total_income.amount),
            total_expense=_money(summary.total_expense.amount),
            net=_money(net),
            categories=cats,
        )


class ReviewQueuePresenter:
    def present(self, pending: list[Transaction], categories) -> ReviewQueueVM:
        opts = [CategoryOptionVM(id=c.id, name=c.name) for c in categories]
        items = [
            ReviewQueueItemVM(
                transaction_id=t.id, description=t.description_raw,
                amount=_money(t.amount.amount), date=t.posted_date.isoformat(),
                category_options=opts,
            )
            for t in pending
        ]
        return ReviewQueueVM(items=items, empty=len(items) == 0)


class SyncResultPresenter:
    def present(self, result) -> SyncResultVM:
        msg = f"Imported {result.new_count} new, skipped {result.skipped_count}."
        if result.errors:
            msg += f" {len(result.errors)} errors."
        return SyncResultVM(
            new_count=result.new_count, skipped_count=result.skipped_count,
            errors=result.errors, message=msg,
        )