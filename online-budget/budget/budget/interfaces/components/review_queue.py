from django_components import Component

from budget.budget.interfaces.view_models import ReviewQueueVM


class ReviewQueueComponent(Component):
    template_name = "review_queue.html"

    def __init__(self, vm: ReviewQueueVM, **kwargs):
        super().__init__(**kwargs)
        self.vm = vm

    def get_context_data(self, **kwargs):
        return {"vm": self.vm}
