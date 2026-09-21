import uuid
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth import get_user_model
from django_tenants.utils import schema_context
from apps.tenants.models import Client, Domain

class Command(BaseCommand):
    help = 'Create a new tenant (client) with a default admin user for local testing.'

    def add_arguments(self, parser):
        parser.add_argument('name', type=str, help='Human readable name of the tenant')
        parser.add_argument('schema_name', type=str, help='Schema name / subdomain identifier (lowercase, alphanumeric)')
        parser.add_argument('--admin-email', type=str, default='admin@example.com', help='Email for the admin user')
        parser.add_argument('--admin-password', type=str, default='adminpass123', help='Password for the admin user')
        parser.add_argument('--admin-username', type=str, default='admin', help='Username for the admin user')
        parser.add_argument('--domain', type=str, help='Custom domain (default: {schema_name}.teamproject.deep-technologies.com)')

    def handle(self, *args, **options):
        name = options['name']
        schema_name = options['schema_name']
        admin_email = options['admin_email']
        admin_password = options['admin_password']
        admin_username = options['admin_username']
        domain_name = options.get('domain') or f"{schema_name}.teamproject.deep-technologies.com"

        # Validate schema name uniqueness
        if Client.objects.filter(schema_name=schema_name).exists():
            raise CommandError(f"Tenant with schema_name '{schema_name}' already exists.")

        # Create tenant (Client) instance
        tenant = Client(
            name=name,
            schema_name=schema_name,
            plan='free',
            is_active=True,
        )
        tenant.save()
        self.stdout.write(self.style.SUCCESS(f"Created tenant '{name}' with schema '{schema_name}'."))

        # Create domain entry
        domain = Domain(domain=domain_name, tenant=tenant, is_primary=True)
        domain.save()
        self.stdout.write(self.style.SUCCESS(f"Created domain '{domain_name}'."))

        # Create admin user inside the tenant schema
        User = get_user_model()
        with schema_context(schema_name):
            if User.objects.filter(username=admin_username).exists():
                raise CommandError(f"Admin user '{admin_username}' already exists in tenant '{schema_name}'.")
            admin_user = User.objects.create_superuser(
                username=admin_username,
                email=admin_email,
                password=admin_password,
                role='admin'
            )
            self.stdout.write(self.style.SUCCESS(f"Created admin user '{admin_username}' for tenant '{schema_name}'."))

        self.stdout.write(self.style.SUCCESS('Tenant setup complete.'))
