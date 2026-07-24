from budget.budget.application.dtos import SyncTransactionsDto
from budget.budget.application.ports import RBCScraper, TransactionRepository
from budget.budget.domain.exceptions import SyncFailed
from budget.budget.services.categorization_service import CategorizationService

from .sync_result import SyncResult


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