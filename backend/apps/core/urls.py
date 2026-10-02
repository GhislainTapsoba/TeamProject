from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DashboardStatsView, ActivityLogViewSet, WhoAmIView

router = DefaultRouter()
router.register(r'activity-logs', ActivityLogViewSet, basename='activity_log')

urlpatterns = [
    path('dashboard-stats/', DashboardStatsView.as_view(), name='dashboard_stats'),
    path('api/whoami/', WhoAmIView.as_view(), name='whoami'),
    path('', include(router.urls)),
]
