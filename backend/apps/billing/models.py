from datetime import date, timedelta

from django.conf import settings
from django.db import models


class Plan(models.Model):
    name = models.CharField(max_length=50, unique=True)  # "free", "pro", "enterprise"
    display_name = models.CharField(max_length=100, blank=True)
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)  # In XOF
    max_users = models.IntegerField(default=5)
    max_projects = models.IntegerField(default=3)
    features = models.JSONField(default=list, blank=True)

    @property
    def is_free(self):
        return self.price_monthly <= 0

    def __str__(self):
        return f"{self.display_name or self.name.capitalize()} ({int(self.price_monthly)} XOF/mois)"


class Subscription(models.Model):
    STATUS_CHOICES = [
        ("active", "Actif"),
        ("past_due", "En retard"),
        ("cancelled", "Suspendu"),
        ("trial", "Essai"),
    ]

    tenant = models.OneToOneField("tenants.Client", on_delete=models.CASCADE, related_name="subscription")
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="subscriptions")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="active")
    current_period_end = models.DateField()
    payment_provider = models.CharField(max_length=20, default="cinetpay")
    provider_reference = models.CharField(max_length=255, blank=True)
    # Period end for which the renewal reminder was already sent (avoids duplicates)
    reminder_sent_for = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def is_expired(self):
        # The free plan never expires
        return not self.plan.is_free and self.current_period_end < date.today()

    @property
    def days_left(self):
        delta = (self.current_period_end - date.today()).days
        return max(0, delta)

    @property
    def grace_until(self):
        if self.status != "past_due":
            return None
        return self.current_period_end + timedelta(days=settings.BILLING_GRACE_DAYS)

    @property
    def is_read_only(self):
        # Only a suspension by the platform blocks writes; lapsed plans are downgraded instead
        return self.status == "cancelled"

    def __str__(self):
        return f"Abonnement {self.tenant.name} - Plan {self.plan.name} ({self.status})"


class Payment(models.Model):
    STATUS_CHOICES = [
        ("pending", "En attente"),
        ("paid", "Payé"),
        ("failed", "Échoué"),
    ]

    tenant = models.ForeignKey("tenants.Client", on_delete=models.CASCADE, related_name="payments")
    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="payments")
    transaction_id = models.CharField(max_length=64, unique=True)
    provider = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default="XOF")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    payment_url = models.URLField(max_length=500, blank=True)
    period_end = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.transaction_id} - {self.tenant.name} - {int(self.amount)} {self.currency} ({self.status})"
