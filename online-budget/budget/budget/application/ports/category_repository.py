from abc import ABC, abstractmethod

from budget.budget.domain.entities import Category


class CategoryRepository(ABC):
    @abstractmethod
    def get(self, category_id: int) -> Category: ...
    @abstractmethod
    def list_all(self) -> list[Category]: ...