from django.db import models
from django_tenants.models import DomainMixin, TenantMixin

from apps.core.security import decrypt_value, encrypt_value


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
            "api_key": decrypt_value(self.mailjet_api_key),
            "secret_key": decrypt_value(self.mailjet_secret_key),
            "from_email": self.mail_from_email,
        }

    def __str__(self):
        return f"{self.name} ({self.schema_name})"


class Domain(DomainMixin):
    def __str__(self):
        return self.domain


class PlatformUser(models.Model):
    """
    Super-admin account for the whole platform, stored in the public schema.

    These accounts are provisioned manually (management command), never through
    self-service, and authenticate with Supabase like everyone else: the link is
    the Supabase user id. Every privileged action they take is written to
    PlatformAuditLog.
    """

    email = models.EmailField(unique=True)
    supabase_id = models.UUIDField(unique=True, null=True, blank=True, db_index=True)
    is_superadmin = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    last_login_at = models.DateTimeField(null=True, blank=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    # Consumed by DRF / middleware the same way a Django user is
    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def is_superuser(self):
        return True

    def __str__(self):
        return f"Platform admin: {self.email}"


class PlatformAuditLog(models.Model):
    """Append-only trail of every privileged action in the platform console."""

    actor_email = models.EmailField()
    action = models.CharField(max_length=80)
    target = models.CharField(max_length=255, blank=True)
    detail = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.created_at:%Y-%m-%d %H:%M} {self.actor_email} {self.action} {self.target}"
