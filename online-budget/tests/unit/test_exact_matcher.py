from budget.budget.application.matching.exact_matcher import match
from budget.budget.domain.entities import Category, CategoryRule
from budget.budget.domain.value_objects import NormalizedTitle


def test_hit():
    cat = Category(id=1, name="Coffee")
    rule = CategoryRule(id=10, match_key="tim hortons", category_id=1)
    out = match(NormalizedTitle("tim hortons"), {"tim hortons": rule}, {1: cat})
    assert out is not None
    assert out[1].name == "Coffee"


def test_miss():
    assert match(NormalizedTitle("nope"), rules={}, categories={}) is None