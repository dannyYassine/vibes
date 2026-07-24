from abc import ABC, abstractmethod

from budget.budget.domain.entities import CategoryRule


class CategoryRuleRepository(ABC):
    @abstractmethod
    def find_by_match_key(self, key: str) -> CategoryRule | None: ...
    @abstractmethod
    def save(self, rule: CategoryRule) -> CategoryRule: ...
    @abstractmethod
    def increment_confirmed(self, rule_id: int) -> None: ...
    @abstractmethod
    def all_rules(self) -> list[CategoryRule]: ...