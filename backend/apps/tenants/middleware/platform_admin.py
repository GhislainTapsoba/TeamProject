from django.db import connection
from django.utils.deprecation import MiddlewareMixin
from django_tenants.utils import get_tenant_model, get_public_schema_name


class PlatformAdminBypassMiddleware(MiddlewareMixin):
    """Si la requete vient d'un super-admin (is_superuser), force le schema public.

    Permet aux comptes admin de la plateforme d'acceder a l'admin partage
    sans etre route vers le schema d'un tenant.
    """

    def process_request(self, request):
        user = getattr(request, 'user', None)
        if user is None or not user.is_authenticated:
            return
        if getattr(user, 'is_superadmin', False) or getattr(user, 'is_superuser', False):
            TenantModel = get_tenant_model()
            try:
                public_tenant = TenantModel.objects.get(schema_name=get_public_schema_name())
                connection.set_tenant(public_tenant)
                request.tenant = public_tenant
            except TenantModel.DoesNotExist:
                pass