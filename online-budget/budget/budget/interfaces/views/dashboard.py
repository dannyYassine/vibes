from datetime import date

from dependency_injector.wiring import Provide, inject
from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from budget.budget.application.container import Container
from budget.budget.application.dtos import GetMonthlySummaryDto
from budget.budget.application.use_cases import GetMonthlySummaryUseCase
from budget.budget.interfaces.presenters import DashboardPresenter


@login_required
@inject
def dashboard(
    request,
    summary_usecase: GetMonthlySummaryUseCase = Provide[Container.monthly_summary_usecase],
):
    today = date.today()
    summary = summary_usecase.execute(GetMonthlySummaryDto(year=today.year, month=today.month))
    vm = DashboardPresenter().present(summary)
    return render(request, "dashboard.html", {"vm": vm, "today": today})