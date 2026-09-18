from django.db import models
from django.conf import settings

class Notification(models.Model):
    CHANNEL_CHOICES = [
        ("in_app", "In-app"),
        ("email", "Email"),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default="in_app")
    message = models.CharField(max_length=255)
    read = models.BooleanField(default=False)
    email_confirmed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.channel}] {self.user} - {self.message[:30]}"
