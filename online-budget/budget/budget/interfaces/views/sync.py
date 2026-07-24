from django.contrib.auth.mixins import LoginRequiredMixin
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.http import require_POST

from budget.budget.infrastructure.jobs.sync_job import run_sync_now


@method_decorator(require_POST, name="dispatch")
class SyncNowView(LoginRequiredMixin, View):
    def post(self, request):
        run_sync_now()
        return HttpResponse(
            '<div class="alert alert-info">Syncing in the background — refresh in a minute.</div>',
        )