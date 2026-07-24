from datetime import date, timedelta

from dependency_injector.wiring import Provide, inject
from django_q.tasks import async_task

from budget.budget.application.container import Container
from budget.budget.application.dtos import SyncTransactionsDto
from budget.budget.application.use_cases import SyncTransactionsUseCase


@inject
def run_scheduled_sync(
    sync_usecase: SyncTransactionsUseCase = Provide[Container.sync_usecase],
):
    """Daily 6am — sync last 7 days as a safety overlap."""
    dto = SyncTransactionsDto(sync_since=date.today() - timedelta(days=7))
    sync_usecase.execute(dto)


def run_sync_now(sync_since: date | None = None):
    """Triggered by HTMX 'sync now' button — fire-and-forget."""
    if sync_since is None:
        sync_since = date.today() - timedelta(days=30)
    async_task("budget.budget.infrastructure.jobs.sync_job._run_sync_task", sync_since)


@inject
def _run_sync_task(
    sync_since: date,
    sync_usecase: SyncTransactionsUseCase = Provide[Container.sync_usecase],
):
    """Worker body — injected with the sync use case."""
    dto = SyncTransactionsDto(sync_since=sync_since)
    sync_usecase.execute(dto)