from django.db.models import F

from budget.budget.application.ports import CategoryRuleRepository
from budget.budget.domain.entities import CategoryRule

from ..models import CategoryRuleModel


class DjangoCategoryRuleRepository(CategoryRuleRepository):
    def find_by_match_key(self, key: str) -> CategoryRule | None:
        row = CategoryRuleModel.objects.filter(match_key=key).first()
        return CategoryRule.fromDatabase(row) if row else None

    def save(self, rule: CategoryRule) -> CategoryRule:
        row = CategoryRuleModel.objects.create(
            match_key=rule.match_key, category_id=rule.category_id,
            times_confirmed=rule.times_confirmed,
        )
        return CategoryRule.fromDatabase(row)

    def increment_confirmed(self, rule_id: int) -> None:
        CategoryRuleModel.objects.filter(id=rule_id).update(
            times_confirmed=F("times_confirmed") + 1,
        )

    def all_rules(self) -> list[CategoryRule]:
        return [CategoryRule.fromDatabase(r) for r in CategoryRuleModel.objects.all()]