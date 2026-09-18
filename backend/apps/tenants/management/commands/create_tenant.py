from django.core.management.base import BaseCommand
from django.conf import settings
from django_tenants.utils import schema_context
from apps.tenants.models import Client, Domain
from apps.accounts.models import User
from apps.billing.models import Plan, Subscription
from datetime import date, timedelta

class Command(BaseCommand):
    help = 'Create a new tenant with schema, domain and admin user'

    def add_arguments(self, parser):
        parser.add_argument('--name', type=str, required=True, help='Name of the organisation')
        parser.add_argument('--schema', type=str, required=True, help='Schema name / subdomain')
        parser.add_argument('--domain', type=str, help='Full primary domain (optional, default auto-generated)')
        parser.add_argument('--admin-email', type=str, required=True, help='Email of the organisation admin')
        parser.add_argument('--admin-password', type=str, required=True, help='Password of the organisation admin')
        parser.add_argument('--admin-name', type=str, default='Admin', help='Full name of admin user')
        parser.add_argument('--plan', type=str, default='free', help='Subscription plan (free/pro/enterprise)')

    def handle(self, *args, **options):
        schema_name = options['schema'].lower().strip()
        name = options['name']
        admin_email = options['admin_email']
        admin_password = options['admin_password']
        admin_name = options['admin_name']
        plan_name = options['plan']

        if Client.objects.filter(schema_name=schema_name).exists():
            self.stderr.write(self.style.ERROR(f"Le schema {schema_name} existe déjà."))
            return

        self.stdout.write(f"Création du tenant '{name}' (schema: {schema_name})...")
        client = Client(
            schema_name=schema_name,
            name=name,
            plan=plan_name,
            is_active=True
        )
        client.save()

        domain_str = options.get('domain') or f"{schema_name}.{settings.PLATFORM_DOMAIN}"
        Domain.objects.create(domain=domain_str, tenant=client, is_primary=True)
        # Also register localhost subdomain
        Domain.objects.create(domain=f"{schema_name}.localhost", tenant=client, is_primary=False)

        # Ensure plan exists
        plan, _ = Plan.objects.get_or_create(
            name=plan_name,
            defaults={'price_monthly': 0 if plan_name == 'free' else 15000, 'max_users': 5, 'max_projects': 3}
        )

        Subscription.objects.get_or_create(
            tenant=client,
            defaults={
                'plan': plan,
                'status': 'active',
                'current_period_end': date.today() + timedelta(days=365)
            }
        )

        self.stdout.write("Création du compte administrateur dans le schéma tenant...")
        with schema_context(client.schema_name):
            names = admin_name.split(' ', 1)
            first_name = names[0]
            last_name = names[1] if len(names) > 1 else ''
            user, created = User.objects.get_or_create(
                username=admin_email,
                defaults={
                    'email': admin_email,
                    'first_name': first_name,
                    'last_name': last_name,
                    'role': 'admin',
                    'is_staff': True,
                }
            )
            if created:
                user.set_password(admin_password)
                user.save()

        self.stdout.write(self.style.SUCCESS(
            f"Succès ! Tenant '{name}' créé avec succès.\n"
            f"Domaine : {domain_str}\n"
            f"Localhost : {schema_name}.localhost:3000\n"
            f"Admin : {admin_email}"
        ))
