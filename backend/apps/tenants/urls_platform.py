from django.urls import path

from .platform_views import (
    PlatformAuditView,
    PlatformExtendView,
    PlatformOverviewView,
    PlatformPaymentsView,
    PlatformResetPasswordView,
    PlatformSuspendView,
    PlatformTenantDetailView,
)

urlpatterns = [
    path("overview/", PlatformOverviewView.as_view(), name="platform_overview"),
    path("tenants/<str:schema_name>/", PlatformTenantDetailView.as_view(), name="platform_tenant_detail"),
    path("tenants/<str:schema_name>/suspend/", PlatformSuspendView.as_view(), name="platform_tenant_suspend"),
    path("tenants/<str:schema_name>/extend/", PlatformExtendView.as_view(), name="platform_tenant_extend"),
    path(
        "tenants/<str:schema_name>/reset-password/", PlatformResetPasswordView.as_view(), name="platform_reset_password"
    ),
    path("payments/", PlatformPaymentsView.as_view(), name="platform_payments"),
    path("audit/", PlatformAuditView.as_view(), name="platform_audit"),
]
