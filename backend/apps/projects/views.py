from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Project, ProjectMember, Task
from .serializers import (
    ProjectSerializer,
    ProjectDetailSerializer,
    ProjectMemberSerializer,
    TaskSerializer
)
from apps.core.permissions import IsProjectManagerOrAdmin, IsTenantManager, IsTaskAssigneeOrManager
from apps.notifications.tasks import send_task_assignment_email
from apps.notifications.models import Notification

class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.all().order_by('-created_at')

    def get_serializer_class(self):
        if self.action in ['retrieve', 'kanban']:
            return ProjectDetailSerializer
        return ProjectSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy']:
            return [IsTenantManager()]
        if self.action in ['update', 'partial_update', 'members']:
            return [IsProjectManagerOrAdmin()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        # Set current user as manager if not specified
        manager = serializer.validated_data.get('manager') or self.request.user
        project = serializer.save(manager=manager)
        # Automatically add manager to project members
        ProjectMember.objects.get_or_create(project=project, user=manager)

    @action(detail=True, methods=['get'])
    def kanban(self, request, pk=None):
        project = self.get_object()
        tasks = project.tasks.all().select_related('assignee')
        
        todo = TaskSerializer(tasks.filter(state='todo'), many=True).data
        in_progress = TaskSerializer(tasks.filter(state='in_progress'), many=True).data
        done = TaskSerializer(tasks.filter(state='done'), many=True).data

        return Response({
            'project': ProjectSerializer(project).data,
            'columns': {
                'todo': todo,
                'in_progress': in_progress,
                'done': done,
            }
        })

    @action(detail=True, methods=['get', 'post', 'delete'])
    def members(self, request, pk=None):
        project = self.get_object()
        self.check_object_permissions(request, project)

        if request.method == 'GET':
            members = project.members.all().select_related('user')
            serializer = ProjectMemberSerializer(members, many=True)
            return Response(serializer.data)

        # Add member to project (manager/admin only)
        if request.method == 'POST':
            user_id = request.data.get('user_id')
            if not user_id:
                return Response({'error': 'user_id est requis.'}, status=status.HTTP_400_BAD_REQUEST)
            from apps.accounts.models import User
            if not User.objects.filter(id=user_id, is_active=True).exists():
                return Response({'error': 'Utilisateur introuvable ou inactif.'}, status=status.HTTP_404_NOT_FOUND)
            member, created = ProjectMember.objects.get_or_create(project=project, user_id=user_id)
            return Response(ProjectMemberSerializer(member).data, status=status.HTTP_201_CREATED)

        # Remove member (manager/admin only)
        if request.method == 'DELETE':
            user_id = request.data.get('user_id')
            if not user_id:
                return Response({'error': 'user_id est requis.'}, status=status.HTTP_400_BAD_REQUEST)
            ProjectMember.objects.filter(project=project, user_id=user_id).delete()
            return Response({'detail': 'Membre retiré du projet.'}, status=status.HTTP_204_NO_CONTENT)

class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all().select_related('assignee', 'project')
    serializer_class = TaskSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'update_state']:
            return [IsTaskAssigneeOrManager()]
        if self.action in ['destroy']:
            return [IsProjectManagerOrAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = Task.objects.all().select_related('assignee', 'project')
        
        project_id = self.request.query_params.get('project_id')
        if project_id:
            qs = qs.filter(project_id=project_id)
            
        state = self.request.query_params.get('state')
        if state:
            qs = qs.filter(state=state)
            
        priority = self.request.query_params.get('priority')
        if priority:
            qs = qs.filter(priority=priority)
            
        # "my_tasks" filter for current user
        my_tasks = self.request.query_params.get('my_tasks')
        if my_tasks and my_tasks.lower() in ['true', '1']:
            qs = qs.filter(assignee=self.request.user)
            
        assignee_id = self.request.query_params.get('assignee_id')
        if assignee_id:
            qs = qs.filter(assignee_id=assignee_id)

        return qs

    def perform_create(self, serializer):
        task = serializer.save()
        # If task is assigned to a user, send notification & email
        if task.assignee and task.assignee != self.request.user:
            Notification.objects.create(
                user=task.assignee,
                channel="in_app",
                message=f"Vous avez été assigné(e) à la tâche '{task.title}' dans le projet '{task.project.name}'."
            )
            try:
                send_task_assignment_email.delay(task.id)
            except Exception:
                pass

    def perform_update(self, serializer):
        old_assignee_id = self.get_object().assignee_id
        task = serializer.save()
        # If assignee changed
        if task.assignee and task.assignee_id != old_assignee_id and task.assignee != self.request.user:
            Notification.objects.create(
                user=task.assignee,
                channel="in_app",
                message=f"La tâche '{task.title}' vous a été assignée dans le projet '{task.project.name}'."
            )
            try:
                send_task_assignment_email.delay(task.id)
            except Exception:
                pass

    @action(detail=True, methods=['patch'])
    def update_state(self, request, pk=None):
        """Fast state and order update for Kanban drag-and-drop"""
        task = self.get_object()
        new_state = request.data.get('state')
        new_order = request.data.get('order')

        if new_state:
            if new_state not in ['todo', 'in_progress', 'done']:
                return Response({'error': 'État invalide.'}, status=status.HTTP_400_BAD_REQUEST)
            task.state = new_state

        if new_order is not None:
            task.order = int(new_order)

        task.save()
        return Response(TaskSerializer(task).data)
