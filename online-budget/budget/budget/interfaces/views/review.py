from dependency_injector.wiring import Provide, inject
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.template.loader import render_to_string

from budget.budget.application.container import Container
from budget.budget.application.dtos import GetReviewQueueDto
from budget.budget.application.use_cases import GetReviewQueueUseCase
from budget.budget.interfaces.presenters import ReviewQueuePresenter


@login_required
@inject
def review_queue(
    request,
    review_usecase: GetReviewQueueUseCase = Provide[Container.review_queue_usecase],
):
    pending, categories = review_usecase.execute(GetReviewQueueDto())
    vm = ReviewQueuePresenter().present(pending, categories)
    html = render_to_string("review_queue.html", {"vm": vm})
    return HttpResponse(html)