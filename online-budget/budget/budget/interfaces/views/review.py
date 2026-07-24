from dependency_injector.wiring import Provide, inject
from django.contrib.auth.mixins import LoginRequiredMixin
from django.views import View

from budget.budget.application.container import Container
from budget.budget.application.dtos import GetReviewQueueDto
from budget.budget.application.use_cases import GetReviewQueueUseCase
from budget.budget.interfaces.presenters import ReviewQueuePresenter


class ReviewQueueView(LoginRequiredMixin, View):
    @inject
    def __init__(
        self,
        review_usecase: GetReviewQueueUseCase = Provide[Container.review_queue_usecase],
        **kwargs,
    ):
        super().__init__(**kwargs)

        self._review_usecase = review_usecase

    def get(self, request):
        pending, categories = self._review_usecase.execute(GetReviewQueueDto())
        component = ReviewQueuePresenter().present(pending, categories)
        return component.render_to_response(request=request)
