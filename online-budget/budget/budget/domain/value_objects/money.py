from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Money:
    amount: Decimal

    @classmethod
    def from_str(cls, raw: str) -> "Money":
        cleaned = raw.replace(",", "")
        return cls(Decimal(cleaned))

    @property
    def is_credit(self) -> bool:
        return self.amount >= 0