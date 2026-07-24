from datetime import date

from budget.budget.application.matching.exact_matcher import match
from budget.budget.application.matching.normalizer import normalize
from budget.budget.application.ports import (
    CategoryRepository,
    CategoryRuleRepository,
    TransactionRepository,
)
from budget.budget.domain.entities import CategoryRule, Transaction
from budget.budget.domain.value_objects import Money, NormalizedTitle


class CategorizationService:
    def __init__(
        self, tx_repo: TransactionRepository, rule_repo: CategoryRuleRepository,
        cat_repo: CategoryRepository,
    ):
        self._tx_repo = tx_repo
        self._rule_repo = rule_repo
        self._cat_repo = cat_repo

    def build_new_transaction(self, raw: dict) -> Transaction:
        normalized = normalize(raw["description_raw"])
        return Transaction(
            rbc_transaction_id=raw["rbc_transaction_id"],
            posted_date=date.fromisoformat(raw["posted_date"]),
            description_raw=raw["description_raw"],
            description_normalized=normalized.value,
            amount=Money.from_str(raw["amount_str"]),
            categorization_status="pending",
        )

    def auto_categorize_pending(self):
        from budget.budget.application.use_cases import AutoCategorizeResult
        pending = self._tx_repo.list_pending()
        rules = {r.match_key: r for r in self._rule_repo.all_rules()}
        categories = {c.id: c for c in self._cat_repo.list_all()}
        auto_approved = 0
        queued = 0
        for tx in pending:
            hit = match(NormalizedTitle(tx.description_normalized), rules, categories)
            if hit is None:
                queued += 1
                continue
            rule, category = hit
            self._tx_repo.update_category(tx.id, category.id, status="auto")
            self._rule_repo.increment_confirmed(rule.id)
            auto_approved += 1
        return AutoCategorizeResult(auto_approved=auto_approved, queued=queued)

    def reinforce_rule(self, normalized_key: str, category_id: int) -> bool:
        existing = self._rule_repo.find_by_match_key(normalized_key)
        if existing is None:
            self._rule_repo.save(CategoryRule(
                match_key=normalized_key, category_id=category_id, times_confirmed=1
            ))
            return False
        self._rule_repo.increment_confirmed(existing.id)
        return True