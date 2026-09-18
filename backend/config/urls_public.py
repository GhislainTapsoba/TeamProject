from django.contrib import admin
from django.urls import path, include
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    return Response({
        'status': 'healthy',
        'service': 'teamproject-api-public',
        'schema': 'public'
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='public_health'),
    path('api/tenants/', include('apps.tenants.urls')),
    path('api/billing/', include('apps.billing.urls_public')),
]
