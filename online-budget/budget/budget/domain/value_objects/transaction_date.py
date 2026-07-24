from dataclasses import dataclass


@dataclass(frozen=True)
class TransactionDate:
    value: str  # ISO YYYY-MM-DD