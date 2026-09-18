from django.urls import path
from .views import TenantRegistrationView, CurrentTenantView

urlpatterns = [
    path('register/', TenantRegistrationView.as_view(), name='tenant_register'),
    path('current/', CurrentTenantView.as_view(), name='tenant_current'),
]
