# Bundle Update Log

## 2026-07-24
* **Update**: Views converted from functions to class-based views (DashboardView, SyncNowView, ReviewQueueView, ApproveView) with LoginRequiredMixin. ReviewQueuePresenter now returns ReviewQueueComponent instead of ReviewQueueVM. New ReviewQueueComponent in interfaces/components. Template review_queue.html moved under components/templates. apps.py wiring simplified — views no longer individually wired.
* **Update**: Refactored monolithic files to directory packages — domain, application, infrastructure, interface layers. All large modules (`dtos`, `ports`, `use_cases`, `entities`, `exceptions`, `value_objects`, `models`, `repositories`, `presenters`, `view_models`) split into one-file-per-concept directories.

## 2026-07-23
* **Creation**: Domain layer + 3 entity concepts (Step 2).
* **Creation**: DI container (Step 5).
* **Update**: ORM models + migrations (Step 6).
* **Creation**: Repository implementations (Step 7).
* **Creation**: Services layer (Step 4).
* **Creation**: Application layer + 5 use-case concepts (Step 3).
* **Creation**: Layering rules + dev environment concepts (Step 1).
* **Creation**: Testing strategy + test suite (Step 14).
* **Verification**: All checks green, build complete (Step 15).
* **Update**: Auth wiring (Step 13).
* **Creation**: Views + URL routing + 4 endpoint concepts (Step 12).
* **Creation**: django-components (Step 11).
* **Creation**: Presenters + view models (Step 10).
* **Creation**: Django-Q2 daily sync job (Step 9).
* **Creation**: RBC scraper + CSV parser (Step 8).
* **Initialization**: Created .okf bundle structure (Step 0).