from django.db import models

from .category import CategoryModel


class TransactionModel(models.Model):
    class Status(models.TextChoices):
        AUTO = "auto", "Auto"
        MANUAL = "manual", "Manual"
        PENDING = "pending", "Pending"

    rbc_transaction_id = models.CharField(max_length=120, unique=True)
    posted_date = models.DateField(db_index=True)
    description_raw = models.TextField()
    description_normalized = models.CharField(max_length=200, db_index=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.ForeignKey(CategoryModel, null=True, blank=True, on_delete=models.SET_NULL)
    categorization_status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING,
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    imported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "budget_transaction"
        ordering = ["-posted_date", "-id"]