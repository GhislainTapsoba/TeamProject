from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardStatsView, ActivityLogViewSet

router = DefaultRouter()
router.register(r'activity-logs', ActivityLogViewSet, basename='activity_log')

urlpatterns = [
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('', include(router.urls)),
]
