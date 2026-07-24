from dependency_injector.wiring import Provide, inject
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.views.decorators.http import require_POST

from budget.budget.application.container import Container
from budget.budget.application.dtos import ApproveCategorizationDto
from budget.budget.application.use_cases import ApproveCategorizationUseCase


@require_POST
@login_required
@inject
def approve(
    request,
    tx_id: int,
    approve_usecase: ApproveCategorizationUseCase = Provide[Container.approve_usecase],
):
    category_id = int(request.POST.get("category"))
    approve_usecase.execute(ApproveCategorizationDto(transaction_id=tx_id, category_id=category_id))
    return HttpResponse('<tr></tr>')