from datetime import date, timedelta
from unittest.mock import MagicMock, patch

import requests
from django.test import SimpleTestCase, override_settings
from django_tenants.test.cases import TenantTestCase

from apps.accounts.models import User
from apps.billing.models import Plan, Subscription
from apps.billing.services import create_cinetpay_payment, verify_cinetpay_transaction
from apps.core import supabase
from apps.notifications.models import Notification
from apps.notifications.tasks import MailjetError, _send_task_assignment_email, send_task_assignment_email
from apps.projects.models import Project, Task


def http_response(status_code=200, body=None):
    response = MagicMock(status_code=status_code, ok=200 <= status_code < 300, text=str(body))
    response.json.return_value = body or {}
    return response


@override_settings(
    SUPABASE_URL="https://example.supabase.co",
    SUPABASE_ANON_KEY="anon",
    SUPABASE_SERVICE_ROLE_KEY="service",
)
class SupabaseClientTestCase(SimpleTestCase):
    @patch("apps.core.supabase.requests.post", return_value=http_response(200, {"id": "abc"}))
    def test_create_auth_user(self, post):
        self.assertEqual(supabase.create_auth_user("a@b.com", "pw", {"first_name": "A"}), "abc")
        url = post.call_args.args[0]
        self.assertEqual(url, "https://example.supabase.co/auth/v1/admin/users")
        self.assertTrue(post.call_args.kwargs["json"]["email_confirm"])
        self.assertEqual(post.call_args.kwargs["headers"]["Authorization"], "Bearer service")

    @patch(
        "apps.core.supabase.requests.post",
        return_value=http_response(422, {"msg": "exists", "error_code": "email_exists"}),
    )
    def test_errors_carry_status_and_code(self, _post):
        with self.assertRaises(supabase.SupabaseError) as ctx:
            supabase.create_auth_user("a@b.com", "pw")
        self.assertEqual(
            (ctx.exception.status_code, ctx.exception.code, str(ctx.exception)), (422, "email_exists", "exists")
        )

    @patch("apps.core.supabase.requests.put", return_value=http_response(200))
    def test_update_password(self, put):
        supabase.update_auth_user_password("abc", "new")
        self.assertEqual(put.call_args.kwargs["json"], {"password": "new"})

    @patch("apps.core.supabase.requests.delete", return_value=http_response(200))
    def test_delete_user(self, delete):
        supabase.delete_auth_user("abc")
        self.assertTrue(delete.call_args.args[0].endswith("/admin/users/abc"))

    @patch("apps.core.supabase.requests.post")
    def test_verify_password(self, post):
        post.return_value = http_response(200, {"access_token": "t"})
        self.assertTrue(supabase.verify_password("a@b.com", "good"))
        post.return_value = http_response(400, {"error": "invalid_grant"})
        self.assertFalse(supabase.verify_password("a@b.com", "bad"))
        self.assertEqual(post.call_args.kwargs["headers"]["apikey"], "anon")

    @override_settings(SUPABASE_SERVICE_ROLE_KEY="")
    def test_missing_service_key_is_reported(self):
        with self.assertRaises(supabase.SupabaseError):
            supabase.create_auth_user("a@b.com", "pw")

    @override_settings(SUPABASE_URL="")
    def test_missing_url_is_reported(self):
        with self.assertRaises(supabase.SupabaseError):
            supabase.delete_auth_user("abc")


class ServicesTenantTestCase(TenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Services Org"

    @classmethod
    def get_test_tenant_domain(cls):
        return "services.localhost"

    def setUp(self):
        # The tenant instance is shared by the whole class: reset in-memory credentials
        self.tenant.mailjet_api_key = ""
        self.tenant.mailjet_secret_key = ""
        self.assignee = User.objects.create_user(
            username="e@org.com", email="e@org.com", password="x", first_name="Eve"
        )
        project = Project.objects.create(name="<Projet>")
        self.task = Task.objects.create(project=project, title="<b>Titre</b>", assignee=self.assignee)


class TaskAssignmentEmailTestCase(ServicesTenantTestCase):
    def test_without_mailjet_keys_an_unsent_notice_is_recorded(self):
        result = _send_task_assignment_email(self.tenant, self.task.id)

        self.assertEqual(result, "Mailjet credentials not configured")
        self.assertTrue(Notification.objects.filter(user=self.assignee, channel="email").exists())

    @patch("apps.notifications.tasks.requests.post", return_value=http_response(200))
    def test_email_is_sent_with_escaped_html(self, post):
        self.tenant.set_mailjet_credentials("key", "secret", "from@org.com")

        result = _send_task_assignment_email(self.tenant, self.task.id)

        self.assertEqual(result, "Email sent successfully")
        html = post.call_args.kwargs["json"]["Messages"][0]["HTMLPart"]
        self.assertIn("&lt;b&gt;Titre&lt;/b&gt;", html)
        self.assertNotIn("<b>Titre</b>", html)

    @patch("apps.notifications.tasks.requests.post", return_value=http_response(500, "boom"))
    def test_mailjet_failure_raises_for_retry(self, _post):
        self.tenant.set_mailjet_credentials("key", "secret", "from@org.com")

        with self.assertRaises(MailjetError):
            _send_task_assignment_email(self.tenant, self.task.id)

    def test_unknown_task_or_tenant_is_ignored(self):
        self.assertEqual(_send_task_assignment_email(self.tenant, 999999), "No assignee email")
        self.assertEqual(send_task_assignment_email.run(self.task.id, "does-not-exist"), "Unknown tenant")

    def test_task_runs_inside_the_given_schema(self):
        result = send_task_assignment_email.run(self.task.id, self.tenant.schema_name)

        self.assertEqual(result, "Mailjet credentials not configured")


@override_settings(
    CINETPAY_API_KEY="key",
    CINETPAY_SITE_ID="site",
    CINETPAY_CHECKOUT_URL="https://cinetpay/checkout",
    CINETPAY_CHECK_URL="https://cinetpay/check",
)
class CinetPayServiceTestCase(ServicesTenantTestCase):
    def setUp(self):
        super().setUp()
        self.plan = Plan.objects.create(name="pro-svc", display_name="Pro", price_monthly=15000)
        self.subscription = Subscription.objects.create(
            tenant=self.tenant, plan=self.plan, current_period_end=date.today() + timedelta(days=1)
        )

    @patch("apps.billing.services.requests.post")
    def test_create_payment(self, post):
        post.return_value = http_response(
            200, {"code": "201", "data": {"payment_url": "https://pay", "payment_token": "t"}}
        )

        result = create_cinetpay_payment(self.subscription, self.plan)

        self.assertTrue(result["success"])
        self.assertEqual(result["payment_url"], "https://pay")
        payload = post.call_args.kwargs["json"]
        self.assertEqual((payload["amount"], payload["metadata"]), (15000, str(self.plan.id)))
        self.assertTrue(payload["transaction_id"].startswith(f"sub-{self.subscription.id}-{self.tenant.schema_name}-"))

    @patch("apps.billing.services.requests.post", side_effect=requests.ConnectionError("down"))
    def test_create_payment_handles_network_errors(self, _post):
        result = create_cinetpay_payment(self.subscription, self.plan, return_url="https://back")

        self.assertFalse(result["success"])

    @patch("apps.billing.services.requests.post")
    def test_verify_transaction(self, post):
        post.return_value = http_response(200, {"data": {"status": "ACCEPTED"}})
        self.assertEqual(verify_cinetpay_transaction("tx")["data"]["status"], "ACCEPTED")

        post.side_effect = requests.ConnectionError("down")
        self.assertEqual(verify_cinetpay_transaction("tx")["status"], "ERROR")
