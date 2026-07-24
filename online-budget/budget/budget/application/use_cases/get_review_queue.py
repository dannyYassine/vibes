from budget.budget.application.dtos import GetReviewQueueDto
from budget.budget.application.ports import CategoryRepository, TransactionRepository


class GetReviewQueueUseCase:
    def __init__(self, tx_repo: TransactionRepository, cat_repo: CategoryRepository):
        self._tx_repo = tx_repo
        self._cat_repo = cat_repo

    def execute(self, dto: GetReviewQueueDto):
        pending = self._tx_repo.list_pending()
        categories = self._cat_repo.list_all()
        return pending, categories