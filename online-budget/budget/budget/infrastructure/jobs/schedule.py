

def register_schedules(ScheduleModel):
    """Idempotent — only creates the daily sync if it doesn't exist."""
    name = "rbc-daily-sync"
    if ScheduleModel.objects.filter(name=name).exists():
        return
    ScheduleModel.objects.create(
        name=name,
        func="budget.budget.infrastructure.jobs.sync_job.run_scheduled_sync",
        schedule_type=ScheduleModel.CRON,
        cron="0 6 * * *",
    )