from django.test import TestCase
from django_tenants.test.cases import TenantTestCase
from django_tenants.utils import schema_context
from apps.tenants.models import Client, Domain
from apps.accounts.models import User
from apps.projects.models import Project, Task
from apps.billing.models import Plan, Subscription
from datetime import date, timedelta

class MultiTenantIsolationTestCase(TestCase):
    def setUp(self):
        # Create shared Plan
        self.plan, _ = Plan.objects.get_or_create(
            name="pro",
            defaults={"price_monthly": 15000, "max_users": 20, "max_projects": 25}
        )

        # Create Tenant 1 (Acme Corp)
        self.tenant1 = Client.objects.create(
            schema_name="acme",
            name="Acme Corporation",
            plan="pro"
        )
        Domain.objects.create(domain="acme.teamproject.deep-technologies.com", tenant=self.tenant1, is_primary=True)

        # Create Tenant 2 (Beta Tech)
        self.tenant2 = Client.objects.create(
            schema_name="betacorp",
            name="Beta Corporation",
            plan="pro"
        )
        Domain.objects.create(domain="betacorp.teamproject.deep-technologies.com", tenant=self.tenant2, is_primary=True)

    def test_complete_data_isolation_between_tenants(self):
        """
        Verify that projects, tasks, and users created in Tenant 1 (Acme)
        cannot be accessed or seen by Tenant 2 (Beta), proving PostgreSQL schema isolation.
        """
        # 1. Populate Tenant 1 (Acme)
        with schema_context(self.tenant1.schema_name):
            user_acme = User.objects.create_user(
                username="alice@acme.com",
                email="alice@acme.com",
                first_name="Alice",
                last_name="Acme",
                password="Password123!",
                role="admin"
            )
            project_acme = Project.objects.create(
                name="Projet Confidentiel Acme",
                manager=user_acme,
                status="in_progress"
            )
            Task.objects.create(
                project=project_acme,
                title="Tâche secrète Acme 1",
                state="todo",
                assignee=user_acme
            )

            # Check presence in Tenant 1
            self.assertEqual(Project.objects.count(), 1)
            self.assertEqual(Task.objects.count(), 1)
            self.assertEqual(User.objects.count(), 1)

        # 2. Check Tenant 2 (Beta) — MUST BE COMPLETELY EMPTY OF ACME DATA!
        with schema_context(self.tenant2.schema_name):
            self.assertEqual(Project.objects.count(), 0)
            self.assertEqual(Task.objects.count(), 0)
            self.assertEqual(User.objects.count(), 0)

            # Create Beta's own data
            user_beta = User.objects.create_user(
                username="bob@beta.com",
                email="bob@beta.com",
                first_name="Bob",
                last_name="Beta",
                password="Password123!",
                role="manager"
            )
            project_beta = Project.objects.create(
                name="Projet Public Beta",
                manager=user_beta,
                status="planning"
            )

            self.assertEqual(Project.objects.count(), 1)
            self.assertEqual(Project.objects.first().name, "Projet Public Beta")

        # 3. Re-verify Tenant 1 (Acme) still only has Acme data
        with schema_context(self.tenant1.schema_name):
            self.assertEqual(Project.objects.count(), 1)
            self.assertEqual(Project.objects.first().name, "Projet Confidentiel Acme")
            self.assertFalse(User.objects.filter(email="bob@beta.com").exists())

    def test_encrypted_mailjet_keys_per_tenant(self):
        """
        Verify that Mailjet credentials stored per tenant are encrypted and decrypted accurately.
        """
        self.tenant1.set_mailjet_credentials("test_api_key_123", "test_secret_key_456", "sender@acme.com")
        self.tenant1.save()

        # Check that stored raw fields are encrypted
        self.assertNotEqual(self.tenant1.mailjet_api_key, "test_api_key_123")
        self.assertNotEqual(self.tenant1.mailjet_secret_key, "test_secret_key_456")

        # Check decryption helper
        decrypted = self.tenant1.get_decrypted_mailjet_keys()
        self.assertEqual(decrypted['api_key'], "test_api_key_123")
        self.assertEqual(decrypted['secret_key'], "test_secret_key_456")
        self.assertEqual(decrypted['from_email'], "sender@acme.com")
