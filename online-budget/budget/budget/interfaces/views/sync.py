from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from django.views.decorators.http import require_POST

from budget.budget.infrastructure.jobs.sync_job import run_sync_now


@require_POST
@login_required
def sync_now(request):
    run_sync_now()
    return HttpResponse(
        '<div class="alert alert-info">Syncing in the background — refresh in a minute.</div>',
    )