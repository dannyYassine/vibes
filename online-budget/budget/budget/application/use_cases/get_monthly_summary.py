from budget.budget.application.dtos import GetMonthlySummaryDto
from budget.budget.services.summary_service import SummaryService


class GetMonthlySummaryUseCase:
    def __init__(self, summary_service: SummaryService):
        self._summary = summary_service

    def execute(self, dto: GetMonthlySummaryDto):
        return self._summary.build(dto.year, dto.month)