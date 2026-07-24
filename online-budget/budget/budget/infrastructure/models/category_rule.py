from django.db import models

from .category import CategoryModel


class CategoryRuleModel(models.Model):
    match_key = models.CharField(max_length=200, unique=True, db_index=True)
    category = models.ForeignKey(CategoryModel, on_delete=models.PROTECT, related_name="rules")
    times_confirmed = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "budget_category_rule"
        indexes = [models.Index(fields=["match_key"])]