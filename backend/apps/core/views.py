from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import ActivityLog
from .serializers import ActivityLogSerializer
from apps.core.permissions import IsTenantManager
from apps.projects.models import Project, Task
from apps.accounts.models import User

class DashboardStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        total_projects = Project.objects.count()
        active_projects = Project.objects.filter(status__in=['planning', 'in_progress']).count()
        
        total_tasks = Task.objects.count()
        completed_tasks = Task.objects.filter(state='done').count()
        my_tasks_count = Task.objects.filter(assignee=user).count()
        my_pending_tasks = Task.objects.filter(assignee=user, state__in=['todo', 'in_progress']).count()
        
        team_members_count = User.objects.filter(is_active=True).count()
        
        completion_rate = int((completed_tasks / total_tasks * 100)) if total_tasks > 0 else 0

        # Recent activities
        recent_logs = ActivityLog.objects.all().select_related('user')[:10]

        return Response({
            'total_projects': total_projects,
            'active_projects': active_projects,
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'completion_rate': completion_rate,
            'my_tasks_count': my_tasks_count,
            'my_pending_tasks': my_pending_tasks,
            'team_members_count': team_members_count,
            'recent_activities': ActivityLogSerializer(recent_logs, many=True).data,
        })

class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ActivityLog.objects.all().select_related('user')
    serializer_class = ActivityLogSerializer
    permission_classes = [IsTenantManager]
