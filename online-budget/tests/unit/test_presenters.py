from decimal import Decimal

from budget.budget.domain.entities import MonthlySummary
from budget.budget.domain.value_objects import Money
from budget.budget.interfaces.presenters import DashboardPresenter


def test_dashboard_presenter_formats_money():
    s = MonthlySummary(
        year=2026, month=7,
        total_income=Money(Decimal("1000")),
        total_expense=Money(Decimal("-600")),
        categories=[],
    )
    vm = DashboardPresenter().present(s)
    assert vm.total_income == "$1,000.00"
    assert vm.total_expense == "-$600.00"
    assert vm.net == "$400.00"