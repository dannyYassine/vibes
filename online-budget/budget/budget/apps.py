from django.apps import AppConfig


class BudgetConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "budget.budget"

    def ready(self):
        import django
        from dependency_injector.wiring import wire as di_wire

        from budget.budget.application.container import Container

        # Only wire if Django is fully loaded
        if django.conf.settings.configured:
            import budget.budget.infrastructure.jobs.sync_job as _sync_job
            import budget.budget.interfaces.views.approve as _approve
            import budget.budget.interfaces.views.dashboard as _dashboard
            import budget.budget.interfaces.views.review as _review
            import budget.budget.interfaces.views.sync as _sync
            di_wire(container=Container(), modules=[
                _dashboard,
                _sync,
                _review,
                _approve,
                _sync_job,
            ])

            # Register django-components
            from django_components import component

            from budget.budget.interfaces.components.review_row import ReviewRowComponent
            from budget.budget.interfaces.components.summary_card import SummaryCardComponent
            from budget.budget.interfaces.components.sync_button import SyncButtonComponent
            component.register("summary_card", SummaryCardComponent)
            component.register("review_row", ReviewRowComponent)
            component.register("sync_button", SyncButtonComponent)

            # Register Django-Q2 scheduled sync (idempotent)
            try:
                from django_q.models import Schedule

                from budget.budget.infrastructure.jobs.schedule import register_schedules
                register_schedules(Schedule)
            except Exception:
                pass  # skip during check/migrate — tables or deps may not exist