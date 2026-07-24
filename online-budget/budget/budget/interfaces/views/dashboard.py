from datetime import date

from dependency_injector.wiring import Provide, inject
from django.contrib.auth.mixins import LoginRequiredMixin
from django.shortcuts import render
from django.views import View

from budget.budget.application.container import Container
from budget.budget.application.dtos import GetMonthlySummaryDto
from budget.budget.application.use_cases import GetMonthlySummaryUseCase
from budget.budget.interfaces.presenters import DashboardPresenter


class DashboardView(LoginRequiredMixin, View):
    @inject
    def __init__(
        self,
        summary_usecase: GetMonthlySummaryUseCase = Provide[Container.monthly_summary_usecase],
        **kwargs,
    ):
        super().__init__(**kwargs)
        self._summary_usecase = summary_usecase

    def get(self, request):
        today = date.today()
        summary = self._summary_usecase.execute(
            GetMonthlySummaryDto(year=today.year, month=today.month)
        )
        vm = DashboardPresenter().present(summary)
        return render(request, "dashboard.html", {"vm": vm, "today": today})
