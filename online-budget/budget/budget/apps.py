from django.apps import AppConfig


class BudgetConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "budget"

    def ready(self):
        try:
            from budget.application.container import Container
            Container.wire(modules=[
                "budget.interfaces.views.dashboard",
                "budget.interfaces.views.sync",
                "budget.interfaces.views.review",
                "budget.interfaces.views.approve",
                "budget.infrastructure.jobs.sync_job",
            ])
        except ImportError:
            pass

        try:
            from django_q.models import Schedule
            from budget.infrastructure.jobs.schedule import register_schedules
            register_schedules(Schedule)
        except ImportError:
            pass