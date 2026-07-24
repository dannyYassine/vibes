from budget.budget.application.dtos import ApproveCategorizationDto
from budget.budget.application.ports import CategoryRuleRepository, TransactionRepository
from budget.budget.services.categorization_service import CategorizationService

from .approve_result import ApproveResult


class ApproveCategorizationUseCase:
    def __init__(
        self,
        tx_repo: TransactionRepository,
        rule_repo: CategoryRuleRepository,
        categorizer: CategorizationService
    ):
        self._tx_repo = tx_repo
        self._rule_repo = rule_repo
        self._categorizer = categorizer
def execute(self, dto: ApproveCategorizationDto) -> ApproveResult:

        tx = self._tx_repo.update_category(dto.transaction_id, dto.category_id, status="manual")
        reinforced = self._categorizer.reinforce_rule(tx.description_normalized, dto.category_id)
        return ApproveResult(transaction=tx, rule_reinforced=reinforced)
