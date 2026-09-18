from django.contrib import admin
from .models import Project, ProjectMember, Task

class ProjectMemberInline(admin.TabularInline):
    model = ProjectMember
    extra = 1

class TaskInline(admin.TabularInline):
    model = Task
    extra = 1
    fields = ('title', 'state', 'priority', 'assignee', 'due_date')

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'manager', 'status', 'start_date', 'due_date', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('name', 'description')
    inlines = [ProjectMemberInline, TaskInline]

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'state', 'priority', 'assignee', 'due_date', 'created_at')
    list_filter = ('state', 'priority', 'created_at')
    search_fields = ('title', 'description', 'project__name')
