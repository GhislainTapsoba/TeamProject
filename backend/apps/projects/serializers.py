from rest_framework import serializers

from apps.accounts.models import is_tenant_member
from apps.accounts.serializers import UserSerializer

from .models import Project, ProjectMember, Task

NOT_A_MEMBER = "Cette personne ne fait pas partie de l'organisation."


class TaskSerializer(serializers.ModelSerializer):
    assignee_details = UserSerializer(source="assignee", read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)

    class Meta:
        model = Task
        fields = (
            "id",
            "project",
            "project_name",
            "title",
            "description",
            "state",
            "priority",
            "assignee",
            "assignee_details",
            "due_date",
            "order",
            "created_at",
        )

    def validate_assignee(self, value):
        if value is not None and not is_tenant_member(value):
            raise serializers.ValidationError(NOT_A_MEMBER)
        return value


class ProjectMemberSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source="user", read_only=True)

    class Meta:
        model = ProjectMember
        fields = ("id", "project", "user", "user_details", "created_at")


class ProjectSerializer(serializers.ModelSerializer):
    manager_details = UserSerializer(source="manager", read_only=True)
    total_tasks_count = serializers.ReadOnlyField()
    completed_tasks_count = serializers.ReadOnlyField()
    progress_percentage = serializers.ReadOnlyField()

    class Meta:
        model = Project
        fields = (
            "id",
            "name",
            "description",
            "manager",
            "manager_details",
            "status",
            "start_date",
            "end_date",
            "due_date",
            "created_at",
            "total_tasks_count",
            "completed_tasks_count",
            "progress_percentage",
        )

    def validate_manager(self, value):
        if value is not None and not is_tenant_member(value):
            raise serializers.ValidationError(NOT_A_MEMBER)
        return value


class ProjectDetailSerializer(ProjectSerializer):
    members = ProjectMemberSerializer(many=True, read_only=True)
    tasks = TaskSerializer(many=True, read_only=True)

    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + ("members", "tasks")
