"""Platform console (super-admin) API, served on the public schema."""

import uuid
from datetime import date, timedelta
from unittest.mock import patch

from django.test import override_settings
from django_tenants.test.cases import TenantTestCase
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.accounts.models import TenantMembership, User
from apps.billing.models import Plan, Subscription
from apps.tenants.models import PlatformAuditLog, PlatformUser
from apps.tenants.platform_auth import PlatformJWTAuthentication, ip_is_allowed
from apps.tenants.platform_views import (
    PlatformExtendView,
    PlatformOverviewView,
    PlatformResetPasswordView,
    PlatformSuspendView,
)


class PlatformConsoleTestCase(TenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "platformtest.localhost"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Platform Test Org"

    def setUp(self):
        self.factory = APIRequestFactory()
        self.admin = PlatformUser.objects.create(email="owner@platform.io", supabase_id=uuid.uuid4())
        self.plan = Plan.objects.create(
            name="pro-pf", display_name="Pro", price_monthly=15000, max_users=25, max_projects=30
        )
        self.subscription = Subscription.objects.create(
            tenant=self.tenant, plan=self.plan, status="active", current_period_end=date.today() + timedelta(days=10)
        )
        member = User.objects.create_user(username="m@pf.com", email="m@pf.com", password="x", supabase_id=uuid.uuid4())
        TenantMembership.objects.create(user=member, tenant=self.tenant, role="admin")
        self.member = member

    def _request(self, view, method="get", data=None, **kwargs):
        request = getattr(self.factory, method)("/api/platform/", data or {}, format="json")
        force_authenticate(request, user=self.admin)
        return view.as_view()(request, **kwargs)

    def test_overview_lists_tenants_with_stats(self):
        response = self._request(PlatformOverviewView)

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data["stats"]["tenants"], 1)
        self.assertEqual(response.data["stats"]["active_subscriptions"], 1)
        schemas = [t["schema_name"] for t in response.data["tenants"]]
        self.assertIn(self.tenant.schema_name, schemas)

    def test_regular_user_is_rejected(self):
        request = self.factory.get("/api/platform/")
        force_authenticate(request, user=self.member)  # tenant user, not a PlatformUser
        response = PlatformOverviewView.as_view()(request)
        self.assertEqual(response.status_code, 403)

    def test_suspend_then_reactivate(self):
        response = self._request(PlatformSuspendView, "post", {"suspend": True}, schema_name=self.tenant.schema_name)
        self.assertEqual(response.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.status, "cancelled")
        self.assertTrue(PlatformAuditLog.objects.filter(action="suspend_tenant").exists())

        self._request(PlatformSuspendView, "post", {"suspend": False}, schema_name=self.tenant.schema_name)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.status, "active")

    def test_extend_changes_plan_and_period(self):
        free = Plan.objects.create(name="free-pf", price_monthly=0)
        response = self._request(
            PlatformExtendView, "post", {"days": 30, "plan": "free-pf"}, schema_name=self.tenant.schema_name
        )
        self.assertEqual(response.status_code, 200)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan, free)
        self.assertEqual(self.subscription.current_period_end, date.today() + timedelta(days=40))
        log = PlatformAuditLog.objects.get(action="extend_subscription")
        self.assertEqual(log.detail["new_plan"], "free-pf")

    def test_extend_rejects_out_of_range_days(self):
        response = self._request(PlatformExtendView, "post", {"days": 99999}, schema_name=self.tenant.schema_name)
        self.assertEqual(response.status_code, 400)

    def test_unknown_tenant_is_404(self):
        response = self._request(PlatformSuspendView, "post", {}, schema_name="does-not-exist")
        self.assertEqual(response.status_code, 404)

    @patch("apps.tenants.platform_views.supabase.update_auth_user_password")
    def test_reset_member_password(self, update):
        response = self._request(
            PlatformResetPasswordView,
            "post",
            {"email": "m@pf.com", "new_password": "Un-Mot-De-Passe-Costaud-1"},
            schema_name=self.tenant.schema_name,
        )
        self.assertEqual(response.status_code, 200, response.data)
        update.assert_called_once()
        self.assertTrue(PlatformAuditLog.objects.filter(action="reset_member_password").exists())

    def test_reset_password_rejects_short_password(self):
        response = self._request(
            PlatformResetPasswordView,
            "post",
            {"email": "m@pf.com", "new_password": "court"},
            schema_name=self.tenant.schema_name,
        )
        self.assertEqual(response.status_code, 400)


class PlatformAuthTestCase(TenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "platformauth.localhost"

    def setUp(self):
        self.factory = APIRequestFactory()
        self.supabase_id = uuid.uuid4()
        self.admin = PlatformUser.objects.create(email="auth@platform.io", supabase_id=self.supabase_id)

    @patch("apps.tenants.platform_auth.decode_supabase_token")
    def test_valid_platform_token_authenticates(self, decode):
        decode.return_value = {"sub": str(self.supabase_id)}
        request = self.factory.get("/api/platform/overview/", HTTP_AUTHORIZATION="Bearer tok")

        user, _ = PlatformJWTAuthentication().authenticate(request)

        self.assertEqual(user, self.admin)
        self.admin.refresh_from_db()
        self.assertIsNotNone(self.admin.last_login_at)

    @patch("apps.tenants.platform_auth.decode_supabase_token")
    def test_non_platform_token_is_denied(self, decode):
        decode.return_value = {"sub": str(uuid.uuid4())}
        request = self.factory.get("/api/platform/overview/", HTTP_AUTHORIZATION="Bearer tok")

        with self.assertRaises(PermissionDenied):
            PlatformJWTAuthentication().authenticate(request)

    @override_settings(PLATFORM_IP_ALLOWLIST=["10.0.0.0/8", "203.0.113.5"])
    def test_ip_allowlist(self):
        self.assertTrue(ip_is_allowed("10.1.2.3"))
        self.assertTrue(ip_is_allowed("203.0.113.5"))
        self.assertFalse(ip_is_allowed("8.8.8.8"))
        self.assertFalse(ip_is_allowed(None))

    @override_settings(PLATFORM_IP_ALLOWLIST=[])
    def test_empty_allowlist_allows_all(self):
        self.assertTrue(ip_is_allowed("8.8.8.8"))

    @patch("apps.tenants.platform_auth.decode_supabase_token")
    @override_settings(PLATFORM_IP_ALLOWLIST=["10.0.0.0/8"])
    def test_disallowed_ip_blocks_platform_admin(self, decode):
        decode.return_value = {"sub": str(self.supabase_id)}
        request = self.factory.get("/api/platform/overview/", HTTP_AUTHORIZATION="Bearer tok", REMOTE_ADDR="8.8.8.8")

        with self.assertRaises(PermissionDenied):
            PlatformJWTAuthentication().authenticate(request)
