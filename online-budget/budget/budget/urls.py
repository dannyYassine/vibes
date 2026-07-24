from django.contrib import admin
from django.contrib.auth.views import LoginView, LogoutView
from django.urls import path

from budget.budget.interfaces.views.approve import ApproveView
from budget.budget.interfaces.views.dashboard import DashboardView
from budget.budget.interfaces.views.review import ReviewQueueView
from budget.budget.interfaces.views.sync import SyncNowView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("", DashboardView.as_view(), name="dashboard"),
    path("sync/", SyncNowView.as_view(), name="sync_now"),
    path("review/", ReviewQueueView.as_view(), name="review_queue"),
    path("review/<int:tx_id>/approve/", ApproveView.as_view(), name="approve"),
]