from budget.budget.application.ports import CategoryRepository
from budget.budget.domain.entities import Category

from ..models import CategoryModel


class DjangoCategoryRepository(CategoryRepository):
    def get(self, category_id: int) -> Category:
        return Category.fromDatabase(CategoryModel.objects.get(id=category_id))

    def list_all(self) -> list[Category]:
        return [Category.fromDatabase(c) for c in CategoryModel.objects.all().order_by("name")]