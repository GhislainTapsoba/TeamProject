from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ActivityLogViewSet, DashboardStatsView, WhoAmIView

router = DefaultRouter()
router.register(r"activity-logs", ActivityLogViewSet, basename="activity_log")

urlpatterns = [
    path("dashboard-stats/", DashboardStatsView.as_view(), name="dashboard_stats"),
    path("whoami/", WhoAmIView.as_view(), name="whoami"),
    path("", include(router.urls)),
]
