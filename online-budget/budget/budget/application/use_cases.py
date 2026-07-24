from dataclasses import dataclass

from budget.budget.application.dtos import (
    ApproveCategorizationDto,
    AutoCategorizeDto,
    GetMonthlySummaryDto,
    GetReviewQueueDto,
    SyncTransactionsDto,
)
from budget.budget.application.ports import (
    CategoryRepository,
    CategoryRuleRepository,
    RBCScraper,
    TransactionRepository,
)
from budget.budget.domain.entities import Transaction
from budget.budget.domain.exceptions import SyncFailed
from budget.budget.services.categorization_service import CategorizationService
from budget.budget.services.summary_service import SummaryService


@dataclass
class SyncResult:
    new_count: int
    skipped_count: int
    errors: list


class SyncTransactionsUseCase:
    def __init__(
        self, scraper: RBCScraper, repo: TransactionRepository,
        categorizer: CategorizationService,
    ):
        self._scraper = scraper
        self._repo = repo
        self._categorizer = categorizer

    def execute(self, dto: SyncTransactionsDto) -> SyncResult:
        try:
            raw_txs = self._scraper.scrape(dto.sync_since)
        except Exception as exc:
            raise SyncFailed(f"RBC scrape failed: {exc}") from exc
        new_ids = []
        skipped = 0
        errors = []
        for raw in raw_txs:
            if self._repo.exists(raw["rbc_transaction_id"]):
                skipped += 1
                continue
            tx = self._categorizer.build_new_transaction(raw)
            saved = self._repo.save(tx)
            new_ids.append(saved.id)
        self._categorizer.auto_categorize_pending()
        return SyncResult(new_count=len(new_ids), skipped_count=skipped, errors=errors)


@dataclass
class AutoCategorizeResult:
    auto_approved: int
    queued: int


class AutoCategorizeUseCase:
    AUTO_APPROVE_THRESHOLD = 1  # fixed code constant, not a setting

    def __init__(self, categorizer: CategorizationService, repo: TransactionRepository):
        self._categorizer = categorizer
        self._repo = repo

    def execute(self, dto: AutoCategorizeDto) -> AutoCategorizeResult:
        return self._categorizer.auto_categorize_pending()


@dataclass
class ApproveResult:
    transaction: Transaction
    rule_reinforced: bool


class ApproveCategorizationUseCase:
    def __init__(
        self, tx_repo: TransactionRepository, rule_repo: CategoryRuleRepository,
        categorizer: CategorizationService,
    ):
        self._tx_repo = tx_repo
        self._rule_repo = rule_repo
        self._categorizer = categorizer

    def execute(self, dto: ApproveCategorizationDto) -> ApproveResult:
        tx = self._tx_repo.update_category(dto.transaction_id, dto.category_id, status="manual")
        reinforced = self._categorizer.reinforce_rule(tx.description_normalized, dto.category_id)
        return ApproveResult(transaction=tx, rule_reinforced=reinforced)


class GetMonthlySummaryUseCase:
    def __init__(self, summary_service: SummaryService):
        self._summary = summary_service

    def execute(self, dto: GetMonthlySummaryDto):
        return self._summary.build(dto.year, dto.month)


class GetReviewQueueUseCase:
    def __init__(self, tx_repo: TransactionRepository, cat_repo: CategoryRepository):
        self._tx_repo = tx_repo
        self._cat_repo = cat_repo

    def execute(self, dto: GetReviewQueueDto):
        pending = self._tx_repo.list_pending()
        categories = self._cat_repo.list_all()
        return pending, categories