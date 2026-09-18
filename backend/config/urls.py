from django.contrib import admin
from django.urls import path, include
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from django.db import connection

@api_view(['GET'])
@permission_classes([AllowAny])
def tenant_health_check(request):
    tenant_name = getattr(connection.tenant, 'name', 'Unknown')
    schema_name = getattr(connection.tenant, 'schema_name', 'Unknown')
    return Response({
        'status': 'healthy',
        'tenant': tenant_name,
        'schema': schema_name,
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', tenant_health_check, name='tenant_health'),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/projects/', include('apps.projects.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/billing/', include('apps.billing.urls_tenant')),
    path('api/core/', include('apps.core.urls')),
]
