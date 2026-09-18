from django.db import models
from django.conf import settings

class Project(models.Model):
    STATUS_CHOICES = [
        ("planning", "Planification"),
        ("in_progress", "En cours"),
        ("on_hold", "En pause"),
        ("completed", "Terminé"),
        ("cancelled", "Annulé"),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="managed_projects"
    )
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="in_progress")
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def total_tasks_count(self):
        return self.tasks.count()

    @property
    def completed_tasks_count(self):
        return self.tasks.filter(state="done").count()

    @property
    def progress_percentage(self):
        total = self.total_tasks_count
        if total == 0:
            return 0
        return int((self.completed_tasks_count / total) * 100)

    def __str__(self):
        return self.name

class ProjectMember(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="members")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="project_memberships")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("project", "user")

    def __str__(self):
        return f"{self.user} dans {self.project}"

class Task(models.Model):
    STATE_CHOICES = [
        ("todo", "À faire"),
        ("in_progress", "En cours"),
        ("done", "Terminé"),
    ]
    PRIORITY_CHOICES = [
        ("low", "Basse"),
        ("medium", "Moyenne"),
        ("high", "Haute"),
    ]

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    state = models.CharField(max_length=20, choices=STATE_CHOICES, default="todo")
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default="medium")
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tasks"
    )
    due_date = models.DateField(null=True, blank=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', '-created_at']

    def __str__(self):
        return f"[{self.get_state_display()}] {self.title}"
