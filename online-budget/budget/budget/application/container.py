from dependency_injector import containers, providers

from budget.budget.application.use_cases import (
    ApproveCategorizationUseCase,
    AutoCategorizeUseCase,
    GetMonthlySummaryUseCase,
    GetReviewQueueUseCase,
    SyncTransactionsUseCase,
)
from budget.budget.services.categorization_service import CategorizationService
from budget.budget.services.summary_service import SummaryService


class Container(containers.DeclarativeContainer):
    """Wiring container. @inject in views/jobs resolves Provide[Container.xxx] here.

    Repositories + scraper are Singleton (imported lazily from infrastructure so
    domain/application stay Django-free at import time). Services hold repo refs
    → also Singleton. Use cases are Factory (one instance per request/job).
    """

    # --- Infrastructure (wired lazily) ---

    transaction_repo = providers.Singleton(
        "budget.budget.infrastructure.repositories.DjangoTransactionRepository",
    )
    category_rule_repo = providers.Singleton(
        "budget.budget.infrastructure.repositories.DjangoCategoryRuleRepository",
    )
    category_repo = providers.Singleton(
        "budget.budget.infrastructure.repositories.DjangoCategoryRepository",
    )
    rbc_scraper = providers.Singleton(
        "budget.budget.infrastructure.rbc.scraper.PlaywrightRBCScraper",
    )

    # --- Services (depend on repos above) ---

    categorization_service = providers.Singleton(
        CategorizationService,
        tx_repo=transaction_repo,
        rule_repo=category_rule_repo,
        cat_repo=category_repo,
    )

    summary_service = providers.Singleton(
        SummaryService,
        tx_repo=transaction_repo,
        cat_repo=category_repo,
    )

    # --- Use cases (Factory = new instance per call) ---

    sync_usecase = providers.Factory(
        SyncTransactionsUseCase,
        scraper=rbc_scraper,
        repo=transaction_repo,
        categorizer=categorization_service,
    )

    auto_categorize_usecase = providers.Factory(
        AutoCategorizeUseCase,
        categorizer=categorization_service,
        repo=transaction_repo,
    )

    approve_usecase = providers.Factory(
        ApproveCategorizationUseCase,
        tx_repo=transaction_repo,
        rule_repo=category_rule_repo,
        categorizer=categorization_service,
    )

    monthly_summary_usecase = providers.Factory(
        GetMonthlySummaryUseCase,
        summary_service=summary_service,
    )

    review_queue_usecase = providers.Factory(
        GetReviewQueueUseCase,
        tx_repo=transaction_repo,
        cat_repo=category_repo,
    )