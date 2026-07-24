
from budget.budget.domain.entities import MonthlySummary
from budget.budget.interfaces.view_models import CategoryTotalVM, MonthlySummaryVM

from ._helpers import _money


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