from rest_framework.permissions import BasePermission, SAFE_METHODS

class IsTenantAdmin(BasePermission):
    """Allows access only to tenant administrators."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')

class IsTenantManager(BasePermission):
    """Allows access to tenant managers or administrators."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['admin', 'manager'])

class IsProjectManagerOrAdmin(BasePermission):
    """
    Project-level permission:
    - Tenant Admin has full access
    - Project Manager has full access to their project
    - Members have read-only access
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
        
        if request.user.role == 'admin':
            return True
            
        # obj can be Project or Task
        project = obj if hasattr(obj, 'manager') else getattr(obj, 'project', None)
        
        if request.method in SAFE_METHODS:
            return True
            
        if project and project.manager_id == request.user.id:
            return True
            
        return False

class IsTaskAssigneeOrManager(BasePermission):
    """
    Task-level permission:
    - Tenant Admin or Project Manager can edit/delete everything
    - Task assignee can update the state/status of their task
    - Safe methods allowed for members
    """
    def has_object_permission(self, request, view, obj):
        if not request.user or not request.user.is_authenticated:
            return False
            
        if request.user.role == 'admin':
            return True
            
        if obj.project.manager_id == request.user.id:
            return True
            
        if request.method in SAFE_METHODS:
            return True
            
        # Assignee can update task state
        if obj.assignee_id == request.user.id:
            if set(request.data.keys()).issubset({'state', 'status'}):
                return True
                
        return False
