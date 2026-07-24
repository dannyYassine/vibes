from dataclasses import dataclass

from budget.budget.domain.entities import Transaction


@dataclass
class ApproveResult:
    transaction: Transaction
    rule_reinforced: bool