from dataclasses import dataclass
from decimal import Decimal

from ..value_objects import Money
from .category import Category


@dataclass
class CategoryTotal:
    category: Category
    amount: Money
    percentage: Decimal