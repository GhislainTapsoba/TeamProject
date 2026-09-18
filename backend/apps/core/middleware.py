from django.http import JsonResponse
from django.db import connection
from .models import ActivityLog

class SubscriptionCheckMiddleware:
    """
    Ensures that tenants with expired or cancelled subscriptions
    cannot modify data (read-only grace period), preventing data loss
    while enforcing SaaS billing requirements.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        tenant = getattr(connection, 'tenant', None)
        # Public schema is unrestricted
        if not tenant or tenant.schema_name == 'public':
            return self.get_response(request)

        # Allow safe HTTP methods (read-only)
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return self.get_response(request)

        # Allow auth, billing checkout, and logout endpoints even if expired
        path = request.path
        if any(allowed in path for allowed in ['/api/auth/', '/api/billing/', '/admin/']):
            return self.get_response(request)

        # Check tenant subscription
        subscription = getattr(tenant, 'subscription', None)
        if subscription and subscription.is_expired and subscription.status != 'active':
            return JsonResponse({
                'error': 'Abonnement expiré',
                'detail': "Votre abonnement a expiré. L'accès est actuellement restreint en lecture seule. Rendez-vous dans Paramètres > Facturation pour régulariser.",
                'code': 'subscription_expired'
            }, status=402)

        return self.get_response(request)

class ActivityAuditMiddleware:
    """
    Logs administrative and mutating API actions for compliance and support.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        # Only log mutating actions from authenticated users
        if request.method in ['POST', 'PUT', 'PATCH', 'DELETE'] and getattr(request, 'user', None) and request.user.is_authenticated:
            if response.status_code < 400 and not request.path.startswith('/api/auth/login'):
                ip = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', '')).split(',')[0].strip()
                action_str = f"{request.method} {request.path}"
                try:
                    ActivityLog.objects.create(
                        user=request.user,
                        action=action_str,
                        ip_address=ip if ip else None,
                        details=f"Status: {response.status_code}"
                    )
                except Exception:
                    pass

        return response
