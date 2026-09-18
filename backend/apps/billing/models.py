from django.db import models
from datetime import date

class Plan(models.Model):
    name = models.CharField(max_length=50, unique=True)  # "free", "pro", "enterprise"
    display_name = models.CharField(max_length=100, blank=True)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)  # In XOF
    max_users = models.IntegerField(default=5)
    max_projects = models.IntegerField(default=3)
    features = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.display_name or self.name.capitalize()} ({int(self.price_monthly)} XOF/mois)"

class Subscription(models.Model):
    STATUS_CHOICES = [
        ("active", "Actif"),
        ("past_due", "En retard"),
        ("cancelled", "Annulé"),
        ("trial", "Essai"),
    ]

    tenant = models.OneToOneField('tenants.Client', on_delete=models.CASCADE, related_name="subscription")
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    current_period_end = models.DateField()
    payment_provider = models.CharField(max_length=20, default="cinetpay")
    provider_reference = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_expired(self):
        return self.current_period_end < date.today()

    @property
    def days_left(self):
        delta = (self.current_period_end - date.today()).days
        return max(0, delta)

    def __str__(self):
        return f"Abonnement {self.tenant.name} - Plan {self.plan.name} ({self.status})"
