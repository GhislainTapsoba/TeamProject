from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("manager", "Manager"),
        ("employee", "Employee"),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="employee")
    phone = models.CharField(max_length=30, blank=True)
    avatar_url = models.URLField(blank=True)

    @property
    def full_name(self):
        name = f"{self.first_name} {self.last_name}".strip()
        return name if name else self.username

    def __str__(self):
        return f"{self.full_name} ({self.role})"
