from django.contrib import admin
from django.contrib.auth.views import LoginView, LogoutView
from django.urls import path

from budget.budget.interfaces.views import approve, dashboard, review, sync

urlpatterns = [
    path("admin/", admin.site.urls),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("", dashboard.dashboard, name="dashboard"),
    path("sync/", sync.sync_now, name="sync_now"),
    path("review/", review.review_queue, name="review_queue"),
    path("review/<int:tx_id>/approve/", approve.approve, name="approve"),
]