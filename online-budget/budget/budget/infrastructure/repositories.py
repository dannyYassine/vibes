
from django.db.models import F
from django.utils import timezone

from budget.budget.application.ports import (
    CategoryRepository,
    CategoryRuleRepository,
    TransactionRepository,
)
from budget.budget.domain.entities import Category, CategoryRule, Transaction

from .django_models import CategoryModel, CategoryRuleModel, TransactionModel


class DjangoTransactionRepository(TransactionRepository):
    def save(self, tx: Transaction) -> Transaction:
        row = TransactionModel.objects.create(
            rbc_transaction_id=tx.rbc_transaction_id,
            posted_date=tx.posted_date,
            description_raw=tx.description_raw,
            description_normalized=tx.description_normalized,
            amount=tx.amount.amount,
            categorization_status=tx.categorization_status,
        )
        return Transaction.fromDatabase(row)

    def get(self, tx_id: int) -> Transaction:
        return Transaction.fromDatabase(TransactionModel.objects.get(id=tx_id))

    def list_pending(self) -> list[Transaction]:
        return [
            Transaction.fromDatabase(r)
            for r in TransactionModel.objects.filter(categorization_status="pending")
        ]

    def list_for_month(self, year: int, month: int) -> list[Transaction]:
        rows = TransactionModel.objects.filter(posted_date__year=year, posted_date__month=month)
        return [Transaction.fromDatabase(r) for r in rows]

    def update_category(self, tx_id: int, category_id: int, status: str) -> Transaction:
        row = TransactionModel.objects.get(id=tx_id)
        row.category_id = category_id
        row.categorization_status = status
        row.approved_at = timezone.now() if status != "pending" else None
        row.save()
        return Transaction.fromDatabase(row)

    def exists(self, rbc_transaction_id: str) -> bool:
        return TransactionModel.objects.filter(rbc_transaction_id=rbc_transaction_id).exists()


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


class DjangoCategoryRepository(CategoryRepository):
    def get(self, category_id: int) -> Category:
        return Category.fromDatabase(CategoryModel.objects.get(id=category_id))

    def list_all(self) -> list[Category]:
        return [Category.fromDatabase(c) for c in CategoryModel.objects.all().order_by("name")]