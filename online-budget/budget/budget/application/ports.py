from abc import ABC, abstractmethod
from datetime import date

from budget.budget.domain.entities import (
    Category,
    CategoryRule,
    Transaction,
)


class TransactionRepository(ABC):
    @abstractmethod
    def save(self, tx: Transaction) -> Transaction: ...
    @abstractmethod
    def get(self, tx_id: int) -> Transaction: ...
    @abstractmethod
    def list_pending(self) -> list[Transaction]: ...
    @abstractmethod
    def list_for_month(self, year: int, month: int) -> list[Transaction]: ...
    @abstractmethod
    def update_category(self, tx_id: int, category_id: int, status: str) -> Transaction: ...
    @abstractmethod
    def exists(self, rbc_transaction_id: str) -> bool: ...


class CategoryRuleRepository(ABC):
    @abstractmethod
    def find_by_match_key(self, key: str) -> CategoryRule | None: ...
    @abstractmethod
    def save(self, rule: CategoryRule) -> CategoryRule: ...
    @abstractmethod
    def increment_confirmed(self, rule_id: int) -> None: ...
    @abstractmethod
    def all_rules(self) -> list[CategoryRule]: ...


class CategoryRepository(ABC):
    @abstractmethod
    def get(self, category_id: int) -> Category: ...
    @abstractmethod
    def list_all(self) -> list[Category]: ...


class RBCScraper(ABC):
    @abstractmethod
    def scrape(self, since: date) -> list[dict]: ...