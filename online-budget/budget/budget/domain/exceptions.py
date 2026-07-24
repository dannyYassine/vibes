class BudgetError(Exception):
    """Base."""


class CategoryNotFound(BudgetError):
    pass


class RuleConflict(BudgetError):
    pass


class SyncFailed(BudgetError):
    pass


class RBCLoginError(SyncFailed):
    pass