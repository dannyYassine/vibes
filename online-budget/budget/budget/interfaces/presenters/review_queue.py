from budget.budget.domain.entities import Transaction
from budget.budget.interfaces.components.review_queue import ReviewQueueComponent
from budget.budget.interfaces.view_models import CategoryOptionVM, ReviewQueueItemVM, ReviewQueueVM

from ._helpers import _money


class ReviewQueuePresenter:
    def present(self, pending: list[Transaction], categories) -> ReviewQueueComponent:
        opts = [CategoryOptionVM(id=c.id, name=c.name) for c in categories]
        items = [
            ReviewQueueItemVM(
                transaction_id=t.id, description=t.description_raw,
                amount=_money(t.amount.amount), date=t.posted_date.isoformat(),
                category_options=opts,
            )
            for t in pending
        ]
        vm = ReviewQueueVM(items=items, empty=len(items) == 0)
        return ReviewQueueComponent(vm=vm)
