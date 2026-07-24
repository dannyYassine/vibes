from budget.budget.interfaces.view_models import SyncResultVM


class SyncResultPresenter:
    def present(self, result) -> SyncResultVM:
        msg = f"Imported {result.new_count} new, skipped {result.skipped_count}."
        if result.errors:
            msg += f" {len(result.errors)} errors."
        return SyncResultVM(
            new_count=result.new_count, skipped_count=result.skipped_count,
            errors=result.errors, message=msg,
        )