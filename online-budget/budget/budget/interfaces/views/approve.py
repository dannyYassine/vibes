from dependency_injector.wiring import Provide, inject
from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.http import require_POST

from budget.budget.application.container import Container
from budget.budget.application.dtos import ApproveCategorizationDto
from budget.budget.application.use_cases import ApproveCategorizationUseCase


@method_decorator(require_POST, name="dispatch")
class ApproveView(LoginRequiredMixin, View):
    @inject
    def __init__(
        self,
        approve_usecase: ApproveCategorizationUseCase = Provide[Container.approve_usecase],
        **kwargs,
    ):
        super().__init__(**kwargs)
        self._approve_usecase = approve_usecase

    def post(self, request, tx_id):
        category_id = int(request.POST.get("category"))
        self._approve_usecase.execute(
            ApproveCategorizationDto(transaction_id=tx_id, category_id=category_id)
        )
        return HttpResponse("<tr></tr>")
