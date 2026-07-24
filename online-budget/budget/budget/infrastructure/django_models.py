from django.db import models


class CategoryModel(models.Model):
    name = models.CharField(max_length=80, unique=True)
    color = models.CharField(max_length=7, default="#999999")

    class Meta:
        db_table = "budget_category"

    def __str__(self):
        return self.name


class CategoryRuleModel(models.Model):
    match_key = models.CharField(max_length=200, unique=True, db_index=True)
    category = models.ForeignKey(CategoryModel, on_delete=models.PROTECT, related_name="rules")
    times_confirmed = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "budget_category_rule"
        indexes = [models.Index(fields=["match_key"])]


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