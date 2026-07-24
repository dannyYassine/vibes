
from budget.budget.domain.entities import Category, CategoryRule
from budget.budget.domain.value_objects import NormalizedTitle


def match(
    normalized: NormalizedTitle,
    rules: dict[str, CategoryRule],
    categories: dict[int, Category],
) -> tuple[CategoryRule, Category] | None:
    """Return (rule, category) if exact match_key hit, else None."""
    rule = rules.get(normalized.value)
    if rule is None:
        return None
    category = categories.get(rule.category_id)
    if category is None:
        return None
    return rule, category