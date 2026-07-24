from dataclasses import dataclass


@dataclass(frozen=True)
class NormalizedTitle:
    value: str