"""
End-to-end API tests running inside a real tenant schema (django-tenants).
Authentication is forced on the client: Supabase JWT validation is covered
separately in test_authentication.py.
"""

from datetime import date, timedelta
from unittest.mock import patch

from django.http import Http404
from django.test import Client, RequestFactory, override_settings
from django.utils import timezone
from django_tenants.test.cases import TenantTestCase
from rest_framework.test import APIClient, APIRequestFactory

from apps.accounts.models import TenantMembership, User
from apps.billing.models import Payment, Plan, Subscription
from apps.billing.services import apply_payment, refresh_payment
from apps.billing.tasks import check_subscriptions
from apps.billing.views import CinetPayWebhookView, mock_checkout
from apps.core.middleware import ActivityAuditMiddleware
from apps.core.models import ActivityLog
from apps.notifications.models import Notification
from apps.projects.models import Project, ProjectMember, Task


class TenantAPITestCase(TenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "API Test Org"

    @classmethod
    def get_test_tenant_domain(cls):
        return "apitest.localhost"

    def setUp(self):
        self.plan = Plan.objects.create(
            name="team", display_name="Team", price_monthly=0, max_users=10, max_projects=10
        )
        self.subscription = Subscription.objects.create(
            tenant=self.tenant,
            plan=self.plan,
            status="active",
            current_period_end=date.today() + timedelta(days=30),
        )
        self.admin = self._member("admin@org.com", "admin")
        self.manager = self._member("manager@org.com", "manager")
        self.employee = self._member("employee@org.com", "employee")

    def _member(self, email, role):
        user = User.objects.create_user(username=email, email=email, password="x", role=role)
        TenantMembership.objects.create(user=user, tenant=self.tenant, role=role)
        return user

    def client_for(self, user):
        client = APIClient(HTTP_HOST=self.get_test_tenant_domain())
        client.force_authenticate(user=user)
        return client


class ProjectAPITestCase(TenantAPITestCase):
    def test_manager_creates_project_and_becomes_member(self):
        response = self.client_for(self.manager).post("/api/projects/", {"name": "Site web"}, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        project = Project.objects.get(name="Site web")
        self.assertEqual(project.manager, self.manager)
        self.assertTrue(ProjectMember.objects.filter(project=project, user=self.manager).exists())

    def test_employee_cannot_create_project(self):
        response = self.client_for(self.employee).post("/api/projects/", {"name": "Interdit"}, format="json")

        self.assertEqual(response.status_code, 403)

    def test_project_quota_of_the_plan_is_enforced(self):
        self.plan.max_projects = 1
        self.plan.save()
        Project.objects.create(name="Existant", manager=self.manager)

        response = self.client_for(self.manager).post("/api/projects/", {"name": "De trop"}, format="json")

        self.assertEqual(response.status_code, 403)
        self.assertIn("limité à 1 projets", str(response.data["detail"]))

    def test_kanban_groups_tasks_by_state(self):
        project = Project.objects.create(name="Kanban", manager=self.manager)
        Task.objects.create(project=project, title="A", state="todo")
        Task.objects.create(project=project, title="B", state="done")

        response = self.client_for(self.employee).get(f"/api/projects/{project.id}/kanban/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data["columns"]["todo"]), 1)
        self.assertEqual(len(response.data["columns"]["in_progress"]), 0)
        self.assertEqual(len(response.data["columns"]["done"]), 1)
        self.assertEqual(response.data["project"]["progress_percentage"], 50)

    def test_project_members_management(self):
        project = Project.objects.create(name="Equipe", manager=self.manager)
        client = self.client_for(self.manager)

        added = client.post(f"/api/projects/{project.id}/members/", {"user_id": self.employee.id}, format="json")
        listed = client.get(f"/api/projects/{project.id}/members/")
        missing = client.post(f"/api/projects/{project.id}/members/", {}, format="json")
        unknown = client.post(f"/api/projects/{project.id}/members/", {"user_id": 999999}, format="json")
        removed = client.delete(f"/api/projects/{project.id}/members/", {"user_id": self.employee.id}, format="json")

        self.assertEqual(added.status_code, 201)
        self.assertEqual(len(listed.data), 1)
        self.assertEqual(missing.status_code, 400)
        self.assertEqual(unknown.status_code, 404)
        self.assertEqual(removed.status_code, 204)
        self.assertFalse(ProjectMember.objects.filter(project=project, user=self.employee).exists())

    def test_only_project_manager_or_admin_can_edit(self):
        project = Project.objects.create(name="Avant", manager=self.manager)

        denied = self.client_for(self.employee).patch(f"/api/projects/{project.id}/", {"name": "X"}, format="json")
        allowed = self.client_for(self.admin).patch(f"/api/projects/{project.id}/", {"name": "Après"}, format="json")

        self.assertEqual(denied.status_code, 403)
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(allowed.data["name"], "Après")


@patch("apps.projects.views.send_task_assignment_email")
class TaskAPITestCase(TenantAPITestCase):
    def setUp(self):
        super().setUp()
        self.project = Project.objects.create(name="Produit", manager=self.manager)

    def test_assigning_a_task_notifies_the_assignee(self, send_email):
        response = self.client_for(self.manager).post(
            "/api/projects/tasks/",
            {
                "project": self.project.id,
                "title": "Maquette",
                "assignee": self.employee.id,
            },
            format="json",
        )

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(Notification.objects.filter(user=self.employee, channel="in_app").exists())
        send_email.delay.assert_called_once_with(response.data["id"], self.tenant.schema_name)

    def test_reassigning_a_task_notifies_the_new_assignee(self, send_email):
        task = Task.objects.create(project=self.project, title="Spec", assignee=self.manager)

        response = self.client_for(self.manager).patch(
            f"/api/projects/tasks/{task.id}/", {"assignee": self.employee.id}, format="json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(Notification.objects.filter(user=self.employee).exists())

    def test_task_filters(self, _send_email):
        Task.objects.create(project=self.project, title="Mine", assignee=self.employee, priority="high")
        Task.objects.create(project=self.project, title="Other", state="done", priority="low")
        client = self.client_for(self.employee)

        def titles(query):
            return [t["title"] for t in client.get(f"/api/projects/tasks/?{query}").data["results"]]

        self.assertEqual(titles("my_tasks=true"), ["Mine"])
        self.assertEqual(titles("state=done"), ["Other"])
        self.assertEqual(titles("priority=high"), ["Mine"])
        self.assertEqual(titles(f"assignee_id={self.employee.id}"), ["Mine"])
        self.assertEqual(len(titles(f"project_id={self.project.id}")), 2)

    def test_assignee_can_move_own_task_on_kanban(self, _send_email):
        task = Task.objects.create(project=self.project, title="Drag", assignee=self.employee)

        response = self.client_for(self.employee).patch(
            f"/api/projects/tasks/{task.id}/update_state/", {"state": "in_progress", "order": 3}, format="json"
        )

        self.assertEqual(response.status_code, 200, response.data)
        task.refresh_from_db()
        self.assertEqual((task.state, task.order), ("in_progress", 3))

    def test_invalid_state_is_rejected(self, _send_email):
        task = Task.objects.create(project=self.project, title="Etat", assignee=self.employee)

        response = self.client_for(self.manager).patch(
            f"/api/projects/tasks/{task.id}/update_state/", {"state": "archived"}, format="json"
        )

        self.assertEqual(response.status_code, 400)

    def test_other_employee_cannot_edit_task(self, _send_email):
        other = self._member("other@org.com", "employee")
        task = Task.objects.create(project=self.project, title="Privé", assignee=self.employee)

        response = self.client_for(other).patch(f"/api/projects/tasks/{task.id}/", {"title": "Pirate"}, format="json")

        self.assertEqual(response.status_code, 403)

    def test_project_manager_deletes_task(self, _send_email):
        task = Task.objects.create(project=self.project, title="Obsolète")

        response = self.client_for(self.manager).delete(f"/api/projects/tasks/{task.id}/")

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Task.objects.filter(id=task.id).exists())


class NotificationAPITestCase(TenantAPITestCase):
    def test_notification_lifecycle(self):
        first = Notification.objects.create(user=self.employee, message="Un")
        Notification.objects.create(user=self.employee, message="Deux")
        Notification.objects.create(user=self.manager, message="Pas à moi")
        client = self.client_for(self.employee)

        self.assertEqual(client.get("/api/notifications/").data["count"], 2)
        self.assertEqual(client.get("/api/notifications/unread_count/").data["unread_count"], 2)
        client.patch(f"/api/notifications/{first.id}/mark_read/")
        self.assertEqual(client.get("/api/notifications/unread_count/").data["unread_count"], 1)
        client.post("/api/notifications/mark_all_read/")
        self.assertEqual(client.get("/api/notifications/unread_count/").data["unread_count"], 0)

    def test_email_log_is_not_shown_to_the_user(self):
        Notification.objects.create(user=self.employee, message="Visible")
        Notification.objects.create(user=self.employee, channel="email", message="[Non envoyé] journal")
        client = self.client_for(self.employee)

        response = client.get("/api/notifications/")
        self.assertEqual([n["message"] for n in response.data["results"]], ["Visible"])
        self.assertEqual(client.get("/api/notifications/unread_count/").data["unread_count"], 1)


class DashboardAPITestCase(TenantAPITestCase):
    def test_dashboard_stats_are_scoped_to_the_tenant(self):
        User.objects.create_user(username="outsider@x.com", email="outsider@x.com", password="x")
        project = Project.objects.create(name="Stats", manager=self.manager)
        Task.objects.create(project=project, title="Done", state="done", assignee=self.employee)
        Task.objects.create(project=project, title="Todo", state="todo", assignee=self.employee)

        data = self.client_for(self.employee).get("/api/core/dashboard-stats/").data

        self.assertEqual(data["team_members_count"], 3)
        self.assertEqual(data["total_projects"], 1)
        self.assertEqual(data["completion_rate"], 50)
        self.assertEqual(data["my_pending_tasks"], 1)

    def test_activity_logs_are_restricted_to_managers(self):
        ActivityLog.objects.create(user=self.admin, action="POST /api/projects/")

        self.assertEqual(self.client_for(self.employee).get("/api/core/activity-logs/").status_code, 403)
        self.assertEqual(self.client_for(self.manager).get("/api/core/activity-logs/").data["count"], 1)

    def test_whoami(self):
        data = self.client_for(self.employee).get("/api/core/whoami/").data

        self.assertEqual(data["email"], "employee@org.com")

    def test_audit_middleware_logs_successful_mutations(self):
        request = RequestFactory().post("/api/projects/", REMOTE_ADDR="10.0.0.1")
        request.user = self.manager
        middleware = ActivityAuditMiddleware(lambda r: type("Response", (), {"status_code": 201})())

        middleware(request)

        log = ActivityLog.objects.get()
        self.assertEqual((log.user, log.action, log.ip_address), (self.manager, "POST /api/projects/", "10.0.0.1"))


class AccountsAPITestCase(TenantAPITestCase):
    def test_me_returns_tenant_role(self):
        data = self.client_for(self.manager).get("/api/auth/me/").data

        self.assertEqual(data["role"], "manager")

    def test_profile_update(self):
        response = self.client_for(self.employee).patch("/api/auth/me/", {"first_name": "Eve"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.first_name, "Eve")

    def test_team_list_only_contains_members(self):
        User.objects.create_user(username="outsider@x.com", email="outsider@x.com", password="x")

        emails = {u["email"] for u in self.client_for(self.employee).get("/api/auth/users/").data["results"]}

        self.assertEqual(emails, {"admin@org.com", "manager@org.com", "employee@org.com"})

    def test_admin_changes_member_role(self):
        response = self.client_for(self.admin).patch(
            f"/api/auth/users/{self.employee.id}/", {"role": "manager"}, format="json"
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.employee.get_tenant_role(self.tenant), "manager")
        # Le rôle global du compte, partagé entre organisations, n'est pas touché
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.role, "employee")

    def test_admin_cannot_change_own_role(self):
        response = self.client_for(self.admin).patch(
            f"/api/auth/users/{self.admin.id}/", {"role": "employee"}, format="json"
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(self.admin.get_tenant_role(self.tenant), "admin")

    def test_manager_cannot_change_roles(self):
        response = self.client_for(self.manager).patch(
            f"/api/auth/users/{self.employee.id}/", {"role": "admin"}, format="json"
        )

        self.assertEqual(response.status_code, 403)

    def test_admin_removes_member_from_organisation(self):
        project = Project.objects.create(name="P", manager=self.manager)
        ProjectMember.objects.create(project=project, user=self.employee)
        task = Task.objects.create(project=project, title="T", assignee=self.employee)

        response = self.client_for(self.admin).delete(f"/api/auth/users/{self.employee.id}/")

        self.assertEqual(response.status_code, 204)
        self.assertIsNone(self.employee.get_tenant_role(self.tenant))
        self.assertTrue(User.objects.filter(id=self.employee.id).exists())
        self.assertFalse(ProjectMember.objects.filter(user=self.employee).exists())
        self.assertTrue(Task.objects.filter(id=task.id).exists())

    def test_admin_cannot_remove_themselves(self):
        response = self.client_for(self.admin).delete(f"/api/auth/users/{self.admin.id}/")

        self.assertEqual(response.status_code, 400)

    def test_employee_cannot_add_members(self):
        response = self.client_for(self.employee).post("/api/auth/users/", {"email": "x@org.com"}, format="json")

        self.assertEqual(response.status_code, 403)

    def test_user_quota_of_the_plan_is_enforced(self):
        self.plan.max_users = 3
        self.plan.save()

        response = self.client_for(self.admin).post(
            "/api/auth/users/",
            {
                "email": "fourth@org.com",
                "password": "Un-Mot-De-Passe-Solide-42",
            },
            format="json",
        )

        self.assertEqual(response.status_code, 403)
        self.assertIn("limité à 3 utilisateurs", str(response.data["detail"]))


class BillingAPITestCase(TenantAPITestCase):
    def setUp(self):
        super().setUp()
        self.pro = Plan.objects.create(
            name="pro-test", display_name="Pro", price_monthly=15000, max_users=25, max_projects=30
        )

    def _payment(self, provider="cinetpay", plan=None, **fields):
        plan = plan or self.pro
        return Payment.objects.create(
            tenant=self.tenant,
            plan=plan,
            provider=provider,
            transaction_id=fields.pop("transaction_id", "TPTEST123"),
            amount=plan.price_monthly,
            **fields,
        )

    def test_subscription_usage_counts_tenant_members(self):
        User.objects.create_user(username="outsider@x.com", email="outsider@x.com", password="x")

        usage = self.client_for(self.employee).get("/api/billing/subscription/").data["usage"]

        self.assertEqual(usage["users_count"], 3)
        self.assertEqual(usage["max_users"], 10)

    def test_plans_are_listed(self):
        names = [p["name"] for p in self.client_for(self.employee).get("/api/billing/plans/").data]

        self.assertIn("team", names)

    @override_settings(BILLING_PROVIDER="mock", DEBUG=True)
    def test_admin_starts_a_mock_checkout(self):
        response = self.client_for(self.admin).post("/api/billing/checkout/", {"plan_id": self.pro.id}, format="json")

        self.assertEqual(response.status_code, 201, response.data)
        payment = Payment.objects.get(transaction_id=response.data["transaction_id"])
        self.assertEqual((payment.status, payment.amount, payment.provider), ("pending", 15000, "mock"))
        self.assertIn(f"/api/billing/mock/{payment.transaction_id}/", response.data["payment_url"])

    @override_settings(BILLING_PROVIDER="mock", DEBUG=False)
    def test_mock_provider_is_refused_in_production(self):
        response = self.client_for(self.admin).post("/api/billing/checkout/", {"plan_id": self.pro.id}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Payment.objects.exists())

    @override_settings(BILLING_PROVIDER="cinetpay")
    @patch("apps.billing.services.requests.post")
    def test_cinetpay_checkout(self, post):
        post.return_value.json.return_value = {"code": "201", "data": {"payment_url": "https://pay"}}

        response = self.client_for(self.admin).post("/api/billing/checkout/", {"plan_id": self.pro.id}, format="json")

        self.assertEqual(response.data["payment_url"], "https://pay")
        payload = post.call_args.kwargs["json"]
        self.assertEqual(payload["amount"], 15000)
        self.assertEqual(payload["transaction_id"], response.data["transaction_id"])
        self.assertIn("/api/billing/return/?tx=", payload["return_url"])

    @override_settings(BILLING_PROVIDER="cinetpay")
    @patch("apps.billing.services.requests.post")
    def test_cinetpay_checkout_errors_are_reported(self, post):
        post.return_value.json.return_value = {"code": "608", "message": "MINIMUM_REQUIRED_FIELDS"}

        response = self.client_for(self.admin).post("/api/billing/checkout/", {"plan_id": self.pro.id}, format="json")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(Payment.objects.get().status, "failed")

    def test_checkout_validation(self):
        client = self.client_for(self.admin)

        self.assertEqual(client.post("/api/billing/checkout/", {"plan_id": 999999}, format="json").status_code, 404)
        # The free plan needs no payment
        self.assertEqual(
            client.post("/api/billing/checkout/", {"plan_id": self.plan.id}, format="json").status_code, 400
        )
        self.assertEqual(
            self.client_for(self.employee)
            .post("/api/billing/checkout/", {"plan_id": self.pro.id}, format="json")
            .status_code,
            403,
        )

    @override_settings(DEBUG=True)
    def test_mock_payment_activates_the_plan_once(self):
        payment = self._payment(provider="mock")
        url = f"/api/billing/mock/{payment.transaction_id}/"
        factory = RequestFactory(HTTP_HOST=self.get_test_tenant_domain())

        page = mock_checkout(factory.get(url), payment.transaction_id)
        response = mock_checkout(factory.post(url, {"action": "pay"}), payment.transaction_id)
        mock_checkout(factory.post(url, {"action": "pay"}), payment.transaction_id)

        self.assertContains(page, "15000")
        self.assertEqual(response.status_code, 302)
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan, self.pro)
        self.assertEqual(self.subscription.current_period_end, date.today() + timedelta(days=30))
        self.assertEqual(Payment.objects.get(pk=payment.pk).status, "paid")

    @override_settings(DEBUG=True)
    def test_mock_payment_can_fail(self):
        payment = self._payment(provider="mock")

        Client(HTTP_HOST=self.get_test_tenant_domain()).post(
            f"/api/billing/mock/{payment.transaction_id}/", {"action": "cancel"}
        )

        self.assertEqual(Payment.objects.get(pk=payment.pk).status, "failed")
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan, self.plan)

    def test_mock_checkout_page_does_not_exist_in_production(self):
        payment = self._payment(provider="mock")
        request = RequestFactory().get(f"/api/billing/mock/{payment.transaction_id}/")

        with self.assertRaises(Http404):
            mock_checkout(request, payment.transaction_id)

    def test_renewing_the_same_plan_stacks_the_month(self):
        self.subscription.plan = self.pro
        self.subscription.current_period_end = date.today() + timedelta(days=10)
        self.subscription.save()

        apply_payment(self._payment())

        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.current_period_end, date.today() + timedelta(days=40))

    @patch("apps.billing.services.verify_cinetpay_transaction")
    def test_payment_status_is_rechecked_with_cinetpay(self, verify):
        verify.return_value = {"data": {"status": "ACCEPTED", "amount": "15000", "currency": "XOF"}}
        payment = self._payment()

        response = self.client_for(self.admin).get(f"/api/billing/payments/{payment.transaction_id}/")

        self.assertEqual(response.data["status"], "paid")
        self.subscription.refresh_from_db()
        self.assertEqual((self.subscription.plan, self.subscription.status), (self.pro, "active"))

    @patch("apps.billing.services.verify_cinetpay_transaction")
    def test_underpaid_transaction_is_rejected(self, verify):
        verify.return_value = {"data": {"status": "ACCEPTED", "amount": "100", "currency": "XOF"}}
        payment = self._payment()

        response = self.client_for(self.admin).get(f"/api/billing/payments/{payment.transaction_id}/")

        self.assertEqual(response.data["status"], "failed")
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.plan, self.plan)

    @patch("apps.billing.services.verify_cinetpay_transaction")
    def test_refused_transaction_fails(self, verify):
        verify.return_value = {"data": {"status": "REFUSED"}}
        payment = self._payment()

        self.assertEqual(refresh_payment(payment).status, "failed")

    def test_payments_are_listed_for_admins_only(self):
        self._payment()

        self.assertEqual(len(self.client_for(self.admin).get("/api/billing/payments/").data), 1)
        self.assertEqual(self.client_for(self.employee).get("/api/billing/payments/").status_code, 403)

    def test_payment_return_redirects_to_the_billing_page(self):
        response = Client(HTTP_HOST=self.get_test_tenant_domain()).post(
            "/api/billing/return/?tx=TPABC", {"transaction_id": "ignored"}
        )

        self.assertRedirects(response, "/settings/billing?payment=TPABC", fetch_redirect_response=False)

    def test_suspended_organization_is_read_only(self):
        self.subscription.status = "cancelled"
        self.subscription.save()
        client = self.client_for(self.manager)

        self.assertEqual(client.post("/api/projects/", {"name": "Bloqué"}, format="json").status_code, 402)
        self.assertEqual(client.get("/api/projects/").status_code, 200)

    def test_lapsed_paid_plan_keeps_write_access_during_grace(self):
        self.subscription.plan = self.pro
        self.subscription.status = "past_due"
        self.subscription.current_period_end = date.today() - timedelta(days=1)
        self.subscription.save()

        response = self.client_for(self.manager).post("/api/projects/", {"name": "Permis"}, format="json")

        self.assertEqual(response.status_code, 201)

    @patch("apps.billing.services.verify_cinetpay_transaction")
    def test_webhook_activates_subscription_once(self, verify):
        verify.return_value = {"data": {"status": "ACCEPTED", "amount": "15000", "currency": "XOF"}}
        payment = self._payment()
        view = CinetPayWebhookView.as_view()

        def call():
            return view(APIRequestFactory().post("/webhook/", {"cpm_trans_id": payment.transaction_id}))

        self.assertEqual(call().status_code, 200)
        self.subscription.refresh_from_db()
        first_period_end = self.subscription.current_period_end
        call()
        self.subscription.refresh_from_db()

        self.assertEqual(self.subscription.plan, self.pro)
        self.assertEqual(self.subscription.provider_reference, payment.transaction_id)
        self.assertEqual(self.subscription.current_period_end, first_period_end)

    def test_webhook_validation(self):
        view = CinetPayWebhookView.as_view()

        self.assertEqual(view(APIRequestFactory().post("/webhook/", {}, format="json")).status_code, 400)
        self.assertEqual(view(APIRequestFactory().post("/webhook/", {"cpm_trans_id": "unknown"})).status_code, 200)
        self.assertEqual(view(APIRequestFactory().get("/webhook/")).status_code, 200)


class SubscriptionLifecycleTestCase(TenantAPITestCase):
    def setUp(self):
        super().setUp()
        self.pro = Plan.objects.create(name="pro-life", price_monthly=15000, max_users=25, max_projects=30)
        Plan.objects.get_or_create(name="free", defaults={"price_monthly": 0})
        self.subscription.plan = self.pro
        self.subscription.save()

    def _set(self, status, days_from_today):
        self.subscription.status = status
        self.subscription.current_period_end = date.today() + timedelta(days=days_from_today)
        self.subscription.save()

    def _run(self):
        result = check_subscriptions()
        self.subscription.refresh_from_db()
        return result

    def _admin_notifications(self):
        return Notification.objects.filter(user=self.admin).count()

    def test_ended_trial_goes_back_to_the_free_plan(self):
        self._set("trial", -1)

        self._run()

        self.assertEqual((self.subscription.plan.name, self.subscription.status), ("free", "active"))
        self.assertEqual(self._admin_notifications(), 1)
        self.assertEqual(Notification.objects.filter(user=self.employee).count(), 0)

    def test_ended_paid_period_enters_grace(self):
        self._set("active", -1)

        self._run()

        self.assertEqual((self.subscription.plan, self.subscription.status), (self.pro, "past_due"))
        self.assertIsNotNone(self.subscription.grace_until)

    @override_settings(BILLING_GRACE_DAYS=7)
    def test_grace_period_end_downgrades(self):
        self._set("past_due", -8)

        self._run()

        self.assertEqual(self.subscription.plan.name, "free")

    def test_renewal_reminder_is_sent_once(self):
        self._set("active", 2)

        self._run()
        self._run()

        self.assertEqual(self._admin_notifications(), 1)
        self.assertEqual(self.subscription.status, "active")

    def test_free_plan_never_expires(self):
        self.subscription.plan = self.plan
        self._set("active", -100)

        self._run()

        self.assertEqual((self.subscription.plan, self.subscription.status), (self.plan, "active"))
        self.assertFalse(self.subscription.is_expired)

    def test_abandoned_checkouts_are_failed(self):
        payment = Payment.objects.create(
            tenant=self.tenant, plan=self.pro, provider="mock", transaction_id="TPOLD", amount=15000
        )
        Payment.objects.filter(pk=payment.pk).update(created_at=timezone.now() - timedelta(days=2))

        self.assertEqual(self._run()["abandoned"], 1)
        self.assertEqual(Payment.objects.get(pk=payment.pk).status, "failed")


class TenantInfoAPITestCase(TenantAPITestCase):
    def test_current_tenant(self):
        data = APIClient(HTTP_HOST=self.get_test_tenant_domain()).get("/api/tenants/current/").data

        self.assertEqual(data["name"], "API Test Org")

    def test_registration_is_refused_from_a_tenant_subdomain(self):
        response = APIClient(HTTP_HOST=self.get_test_tenant_domain()).post("/api/tenants/register/", {}, format="json")

        self.assertEqual(response.status_code, 403)
