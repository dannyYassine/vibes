from dataclasses import dataclass


@dataclass
class GetMonthlySummaryDto:
    year: int
    month: int