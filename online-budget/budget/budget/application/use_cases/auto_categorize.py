from budget.budget.application.dtos import AutoCategorizeDto
from budget.budget.application.ports import TransactionRepository
from budget.budget.services.categorization_service import CategorizationService

from .auto_categorize_result import AutoCategorizeResult


class AutoCategorizeUseCase:
    AUTO_APPROVE_THRESHOLD = 1

    def __init__(self, categorizer: CategorizationService, repo: TransactionRepository):
        self._categorizer = categorizer
        self._repo = repo

    def execute(self, dto: AutoCategorizeDto) -> AutoCategorizeResult:
        return self._categorizer.auto_categorize_pending()