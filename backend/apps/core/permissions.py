from rest_framework.permissions import BasePermission, SAFE_METHODS


def _tenant_role(request):
    if getattr(request.user, 'is_superuser', False):
        return 'admin'  # le super-admin plateforme a tous les droits
    return request.user.get_tenant_role()


class IsTenantAdmin(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return _tenant_role(request) == 'admin'


class IsTenantManager(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return _tenant_role(request) in ['admin', 'manager']


class IsProjectManagerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        role = _tenant_role(request)
        if role == 'admin':
            return True

        project = obj if hasattr(obj, 'manager') else getattr(obj, 'project', None)

        if request.method in SAFE_METHODS:
            return True

        if project and project.manager_id == request.user.id:
            return True

        return False


class IsTaskAssigneeOrManager(BasePermission):
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False

        role = _tenant_role(request)
        if role == 'admin':
            return True

        if obj.project.manager_id == request.user.id:
            return True

        if request.method in SAFE_METHODS:
            return True

        if obj.assignee_id == request.user.id:
            if set(request.data.keys()).issubset({'state', 'status'}):
                return True

        return False