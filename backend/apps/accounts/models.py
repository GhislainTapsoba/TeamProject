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

    def get_tenant_role(self, tenant=None):
        """
        Retourne le role de cet utilisateur pour le tenant donne (ou le tenant
        courant si omis). Retourne None si aucune appartenance active n'existe.
        """
        from django.db import connection
        tenant = tenant or getattr(connection, 'tenant', None)
        if tenant is None or tenant.schema_name == 'public':
            return None
        membership = self.memberships.filter(tenant=tenant, is_active=True).first()
        return membership.role if membership else None

    def __str__(self):
        return f"{self.full_name} ({self.role})"


class TenantMembership(models.Model):
    """
    Appartenance d'un utilisateur a un tenant, avec un role specifique a ce tenant.
    Permet a un meme compte d'avoir des roles differents selon le sous-domaine.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='memberships')
    tenant = models.ForeignKey('tenants.Client', on_delete=models.CASCADE, related_name='memberships')
    role = models.CharField(max_length=20, choices=User.ROLE_CHOICES, default='employee')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'tenant')

    def __str__(self):
        return f"{self.user.username} @ {self.tenant.schema_name} = {self.role}"