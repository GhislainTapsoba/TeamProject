from django.db import models
from django_tenants.models import TenantMixin, DomainMixin
from apps.core.security import encrypt_value, decrypt_value

class Client(TenantMixin):
    name = models.CharField(max_length=100)
    plan = models.CharField(max_length=50, default="free")
    is_active = models.BooleanField(default=True)
    mailjet_api_key = models.CharField(max_length=255, blank=True)
    mailjet_secret_key = models.CharField(max_length=255, blank=True)
    mail_from_email = models.EmailField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    auto_create_schema = True

    def set_mailjet_credentials(self, api_key: str, secret_key: str, from_email: str = None):
        if api_key:
            self.mailjet_api_key = encrypt_value(api_key)
        if secret_key:
            self.mailjet_secret_key = encrypt_value(secret_key)
        if from_email:
            self.mail_from_email = from_email

    def get_decrypted_mailjet_keys(self):
        return {
            'api_key': decrypt_value(self.mailjet_api_key),
            'secret_key': decrypt_value(self.mailjet_secret_key),
            'from_email': self.mail_from_email,
        }

    def __str__(self):
        return f"{self.name} ({self.schema_name})"

class Domain(DomainMixin):
    def __str__(self):
        return self.domain


class PlatformUser(models.Model):
    """Super‑admin account stored in the public schema"""
    email = models.EmailField(unique=True)
    is_superadmin = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []

    def __str__(self):
        return f"Platform admin: {self.email}"
