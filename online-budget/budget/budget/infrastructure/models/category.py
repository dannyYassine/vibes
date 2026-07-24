from django.db import models


class CategoryModel(models.Model):
    name = models.CharField(max_length=80, unique=True)
    color = models.CharField(max_length=7, default="#999999")

    class Meta:
        db_table = "budget_category"

    def __str__(self):
        return self.name