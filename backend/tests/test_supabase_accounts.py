import uuid
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models import TenantMembership, User
from apps.accounts.serializers import UserCreateSerializer
from apps.accounts.views import ChangePasswordView
from apps.core.supabase import SupabaseError
from apps.tenants.models import Client
from apps.tenants.views import TenantRegistrationView

REGISTRATION = {
    "organization_name": "Gamma",
    "subdomain": "gamma",
    "admin_email": "Admin@Gamma.com",
    "admin_name": "Grace Gamma",
    "admin_password": "Un-Mot-De-Passe-Solide-42",
}


class TenantRegistrationTestCase(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()

    def _register(self, **extra):
        request = self.factory.post("/api/tenants/register/", REGISTRATION, format="json", **extra)
        return TenantRegistrationView.as_view()(request)

    @patch("apps.tenants.views.supabase.create_auth_user")
    def test_registration_creates_linked_admin(self, create_auth_user):
        supabase_id = uuid.uuid4()
        create_auth_user.return_value = str(supabase_id)

        response = self._register()

        self.assertEqual(response.status_code, 201)
        client = Client.objects.get(schema_name="gamma")
        admin = User.objects.get(email="admin@gamma.com")
        self.assertEqual(admin.supabase_id, supabase_id)
        self.assertEqual(admin.get_tenant_role(client), "admin")
        self.assertEqual(response.data["login_url"], f"https://{response.data['tenant']['domain']}/login")
        create_auth_user.assert_called_once()

    @override_settings(ALLOWED_HOSTS=["localhost"])
    @patch("apps.tenants.views.supabase.create_auth_user")
    def test_registration_from_localhost_points_to_local_subdomain(self, create_auth_user):
        create_auth_user.return_value = str(uuid.uuid4())

        response = self._register(HTTP_HOST="localhost")

        self.assertEqual(response.data["login_url"], "http://gamma.localhost/login")

    @patch("apps.tenants.views.supabase.create_auth_user", side_effect=SupabaseError("down", status_code=500))
    def test_registration_aborts_when_supabase_is_down(self, _create_auth_user):
        response = self._register()

        self.assertEqual(response.status_code, 503)
        self.assertFalse(Client.objects.filter(schema_name="gamma").exists())
        self.assertFalse(User.objects.filter(email="admin@gamma.com").exists())

    @patch("apps.tenants.views.supabase.create_auth_user")
    def test_registration_rejects_existing_email(self, create_auth_user):
        User.objects.create_user(username="admin@gamma.com", email="admin@gamma.com", password="x")

        response = self._register()

        self.assertEqual(response.status_code, 400)
        self.assertIn("admin_email", response.data)
        create_auth_user.assert_not_called()


class UserCreateSerializerTestCase(TestCase):
    def setUp(self):
        self.tenant = Client.objects.create(schema_name="delta", name="Delta")

    def _serializer(self, data):
        with patch("apps.accounts.serializers.connection") as mock_connection:
            mock_connection.tenant = self.tenant
            serializer = UserCreateSerializer(data=data)
            valid = serializer.is_valid()
            user = serializer.save() if valid else None
        return serializer, user

    @patch("apps.accounts.serializers.supabase.create_auth_user")
    def test_new_member_gets_supabase_account_and_membership(self, create_auth_user):
        create_auth_user.return_value = str(uuid.uuid4())

        serializer, user = self._serializer(
            {
                "email": "new@delta.com",
                "role": "manager",
                "password": "Un-Mot-De-Passe-Solide-42",
            }
        )

        self.assertIsNotNone(user, serializer.errors)
        self.assertIsNotNone(user.supabase_id)
        self.assertEqual(user.get_tenant_role(self.tenant), "manager")

    @patch("apps.accounts.serializers.supabase.create_auth_user")
    def test_existing_account_is_attached_without_password(self, create_auth_user):
        existing = User.objects.create_user(username="known@x.com", email="known@x.com", password="x")

        serializer, user = self._serializer({"email": "known@x.com", "role": "employee"})

        self.assertEqual(user, existing, serializer.errors)
        self.assertEqual(existing.get_tenant_role(self.tenant), "employee")
        create_auth_user.assert_not_called()

    def test_new_account_requires_password(self):
        serializer, user = self._serializer({"email": "nopass@delta.com", "role": "employee"})

        self.assertIsNone(user)
        self.assertIn("password", serializer.errors)

    def test_active_member_cannot_be_added_twice(self):
        member = User.objects.create_user(username="m@delta.com", email="m@delta.com", password="x")
        TenantMembership.objects.create(user=member, tenant=self.tenant, role="employee")

        serializer, user = self._serializer({"email": "m@delta.com", "role": "employee"})

        self.assertIsNone(user)
        self.assertIn("email", serializer.errors)


class ChangePasswordViewTestCase(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.user = User.objects.create_user(
            username="p@x.com", email="p@x.com", password="Ancien-Mot-De-Passe-1", supabase_id=uuid.uuid4()
        )

    def _post(self, old_password):
        request = self.factory.post(
            "/api/auth/change-password/",
            {
                "old_password": old_password,
                "new_password": "Nouveau-Mot-De-Passe-42",
            },
            format="json",
        )
        force_authenticate(request, user=self.user)
        return ChangePasswordView.as_view()(request)

    @patch("apps.accounts.views.supabase.update_auth_user_password")
    @patch("apps.accounts.views.supabase.verify_password", return_value=False)
    def test_wrong_old_password_is_rejected(self, _verify, update):
        response = self._post("mauvais")

        self.assertEqual(response.status_code, 400)
        update.assert_not_called()

    @patch("apps.accounts.views.supabase.update_auth_user_password")
    @patch("apps.accounts.views.supabase.verify_password", return_value=True)
    def test_password_is_updated_in_supabase_and_locally(self, _verify, update):
        response = self._post("Ancien-Mot-De-Passe-1")

        self.assertEqual(response.status_code, 200)
        update.assert_called_once_with(self.user.supabase_id, "Nouveau-Mot-De-Passe-42")
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Nouveau-Mot-De-Passe-42"))
