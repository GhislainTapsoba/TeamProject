"""
End-to-end API tests running inside a real tenant schema (django-tenants).
Authentication is forced on the client: Supabase JWT validation is covered
separately in test_authentication.py.
"""
from datetime import date, timedelta
from unittest.mock import patch

from django.test import RequestFactory
from django_tenants.test.cases import TenantTestCase
from rest_framework.test import APIClient, APIRequestFactory

from apps.accounts.models import User, TenantMembership
from apps.billing.models import Plan, Subscription
from apps.billing.views import CinetPayWebhookView
from apps.core.middleware import ActivityAuditMiddleware
from apps.core.models import ActivityLog
from apps.notifications.models import Notification
from apps.projects.models import Project, ProjectMember, Task


class TenantAPITestCase(TenantTestCase):
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = 'API Test Org'

    @classmethod
    def get_test_tenant_domain(cls):
        return 'apitest.localhost'

    def setUp(self):
        self.plan = Plan.objects.create(name='team', display_name='Team', price_monthly=0, max_users=10, max_projects=10)
        self.subscription = Subscription.objects.create(
            tenant=self.tenant, plan=self.plan, status='active',
            current_period_end=date.today() + timedelta(days=30),
        )
        self.admin = self._member('admin@org.com', 'admin')
        self.manager = self._member('manager@org.com', 'manager')
        self.employee = self._member('employee@org.com', 'employee')

    def _member(self, email, role):
        user = User.objects.create_user(username=email, email=email, password='x', role=role)
        TenantMembership.objects.create(user=user, tenant=self.tenant, role=role)
        return user

    def client_for(self, user):
        client = APIClient(HTTP_HOST=self.get_test_tenant_domain())
        client.force_authenticate(user=user)
        return client


class ProjectAPITestCase(TenantAPITestCase):
    def test_manager_creates_project_and_becomes_member(self):
        response = self.client_for(self.manager).post('/api/projects/', {'name': 'Site web'}, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        project = Project.objects.get(name='Site web')
        self.assertEqual(project.manager, self.manager)
        self.assertTrue(ProjectMember.objects.filter(project=project, user=self.manager).exists())

    def test_employee_cannot_create_project(self):
        response = self.client_for(self.employee).post('/api/projects/', {'name': 'Interdit'}, format='json')

        self.assertEqual(response.status_code, 403)

    def test_project_quota_of_the_plan_is_enforced(self):
        self.plan.max_projects = 1
        self.plan.save()
        Project.objects.create(name='Existant', manager=self.manager)

        response = self.client_for(self.manager).post('/api/projects/', {'name': 'De trop'}, format='json')

        self.assertEqual(response.status_code, 403)
        self.assertIn('limité à 1 projets', str(response.data['detail']))

    def test_kanban_groups_tasks_by_state(self):
        project = Project.objects.create(name='Kanban', manager=self.manager)
        Task.objects.create(project=project, title='A', state='todo')
        Task.objects.create(project=project, title='B', state='done')

        response = self.client_for(self.employee).get(f'/api/projects/{project.id}/kanban/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['columns']['todo']), 1)
        self.assertEqual(len(response.data['columns']['in_progress']), 0)
        self.assertEqual(len(response.data['columns']['done']), 1)
        self.assertEqual(response.data['project']['progress_percentage'], 50)

    def test_project_members_management(self):
        project = Project.objects.create(name='Equipe', manager=self.manager)
        client = self.client_for(self.manager)

        added = client.post(f'/api/projects/{project.id}/members/', {'user_id': self.employee.id}, format='json')
        listed = client.get(f'/api/projects/{project.id}/members/')
        missing = client.post(f'/api/projects/{project.id}/members/', {}, format='json')
        unknown = client.post(f'/api/projects/{project.id}/members/', {'user_id': 999999}, format='json')
        removed = client.delete(f'/api/projects/{project.id}/members/', {'user_id': self.employee.id}, format='json')

        self.assertEqual(added.status_code, 201)
        self.assertEqual(len(listed.data), 1)
        self.assertEqual(missing.status_code, 400)
        self.assertEqual(unknown.status_code, 404)
        self.assertEqual(removed.status_code, 204)
        self.assertFalse(ProjectMember.objects.filter(project=project, user=self.employee).exists())

    def test_only_project_manager_or_admin_can_edit(self):
        project = Project.objects.create(name='Avant', manager=self.manager)

        denied = self.client_for(self.employee).patch(f'/api/projects/{project.id}/', {'name': 'X'}, format='json')
        allowed = self.client_for(self.admin).patch(f'/api/projects/{project.id}/', {'name': 'Après'}, format='json')

        self.assertEqual(denied.status_code, 403)
        self.assertEqual(allowed.status_code, 200)
        self.assertEqual(allowed.data['name'], 'Après')


@patch('apps.projects.views.send_task_assignment_email')
class TaskAPITestCase(TenantAPITestCase):
    def setUp(self):
        super().setUp()
        self.project = Project.objects.create(name='Produit', manager=self.manager)

    def test_assigning_a_task_notifies_the_assignee(self, send_email):
        response = self.client_for(self.manager).post('/api/projects/tasks/', {
            'project': self.project.id, 'title': 'Maquette', 'assignee': self.employee.id,
        }, format='json')

        self.assertEqual(response.status_code, 201, response.data)
        self.assertTrue(Notification.objects.filter(user=self.employee, channel='in_app').exists())
        send_email.delay.assert_called_once_with(response.data['id'], self.tenant.schema_name)

    def test_reassigning_a_task_notifies_the_new_assignee(self, send_email):
        task = Task.objects.create(project=self.project, title='Spec', assignee=self.manager)

        response = self.client_for(self.manager).patch(
            f'/api/projects/tasks/{task.id}/', {'assignee': self.employee.id}, format='json'
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(Notification.objects.filter(user=self.employee).exists())

    def test_task_filters(self, _send_email):
        Task.objects.create(project=self.project, title='Mine', assignee=self.employee, priority='high')
        Task.objects.create(project=self.project, title='Other', state='done', priority='low')
        client = self.client_for(self.employee)

        def titles(query):
            return [t['title'] for t in client.get(f'/api/projects/tasks/?{query}').data['results']]

        self.assertEqual(titles('my_tasks=true'), ['Mine'])
        self.assertEqual(titles('state=done'), ['Other'])
        self.assertEqual(titles('priority=high'), ['Mine'])
        self.assertEqual(titles(f'assignee_id={self.employee.id}'), ['Mine'])
        self.assertEqual(len(titles(f'project_id={self.project.id}')), 2)

    def test_assignee_can_move_own_task_on_kanban(self, _send_email):
        task = Task.objects.create(project=self.project, title='Drag', assignee=self.employee)

        response = self.client_for(self.employee).patch(
            f'/api/projects/tasks/{task.id}/update_state/', {'state': 'in_progress', 'order': 3}, format='json'
        )

        self.assertEqual(response.status_code, 200, response.data)
        task.refresh_from_db()
        self.assertEqual((task.state, task.order), ('in_progress', 3))

    def test_invalid_state_is_rejected(self, _send_email):
        task = Task.objects.create(project=self.project, title='Etat', assignee=self.employee)

        response = self.client_for(self.manager).patch(
            f'/api/projects/tasks/{task.id}/update_state/', {'state': 'archived'}, format='json'
        )

        self.assertEqual(response.status_code, 400)

    def test_other_employee_cannot_edit_task(self, _send_email):
        other = self._member('other@org.com', 'employee')
        task = Task.objects.create(project=self.project, title='Privé', assignee=self.employee)

        response = self.client_for(other).patch(f'/api/projects/tasks/{task.id}/', {'title': 'Pirate'}, format='json')

        self.assertEqual(response.status_code, 403)

    def test_project_manager_deletes_task(self, _send_email):
        task = Task.objects.create(project=self.project, title='Obsolète')

        response = self.client_for(self.manager).delete(f'/api/projects/tasks/{task.id}/')

        self.assertEqual(response.status_code, 204)
        self.assertFalse(Task.objects.filter(id=task.id).exists())


class NotificationAPITestCase(TenantAPITestCase):
    def test_notification_lifecycle(self):
        first = Notification.objects.create(user=self.employee, message='Un')
        Notification.objects.create(user=self.employee, message='Deux')
        Notification.objects.create(user=self.manager, message='Pas à moi')
        client = self.client_for(self.employee)

        self.assertEqual(client.get('/api/notifications/').data['count'], 2)
        self.assertEqual(client.get('/api/notifications/unread_count/').data['unread_count'], 2)
        client.patch(f'/api/notifications/{first.id}/mark_read/')
        self.assertEqual(client.get('/api/notifications/unread_count/').data['unread_count'], 1)
        client.post('/api/notifications/mark_all_read/')
        self.assertEqual(client.get('/api/notifications/unread_count/').data['unread_count'], 0)


class DashboardAPITestCase(TenantAPITestCase):
    def test_dashboard_stats_are_scoped_to_the_tenant(self):
        User.objects.create_user(username='outsider@x.com', email='outsider@x.com', password='x')
        project = Project.objects.create(name='Stats', manager=self.manager)
        Task.objects.create(project=project, title='Done', state='done', assignee=self.employee)
        Task.objects.create(project=project, title='Todo', state='todo', assignee=self.employee)

        data = self.client_for(self.employee).get('/api/core/dashboard-stats/').data

        self.assertEqual(data['team_members_count'], 3)
        self.assertEqual(data['total_projects'], 1)
        self.assertEqual(data['completion_rate'], 50)
        self.assertEqual(data['my_pending_tasks'], 1)

    def test_activity_logs_are_restricted_to_managers(self):
        ActivityLog.objects.create(user=self.admin, action='POST /api/projects/')

        self.assertEqual(self.client_for(self.employee).get('/api/core/activity-logs/').status_code, 403)
        self.assertEqual(self.client_for(self.manager).get('/api/core/activity-logs/').data['count'], 1)

    def test_whoami(self):
        data = self.client_for(self.employee).get('/api/core/whoami/').data

        self.assertEqual(data['email'], 'employee@org.com')

    def test_audit_middleware_logs_successful_mutations(self):
        request = RequestFactory().post('/api/projects/', REMOTE_ADDR='10.0.0.1')
        request.user = self.manager
        middleware = ActivityAuditMiddleware(lambda r: type('Response', (), {'status_code': 201})())

        middleware(request)

        log = ActivityLog.objects.get()
        self.assertEqual((log.user, log.action, log.ip_address), (self.manager, 'POST /api/projects/', '10.0.0.1'))


class AccountsAPITestCase(TenantAPITestCase):
    def test_me_returns_tenant_role(self):
        data = self.client_for(self.manager).get('/api/auth/me/').data

        self.assertEqual(data['role'], 'manager')

    def test_profile_update(self):
        response = self.client_for(self.employee).patch('/api/auth/me/', {'first_name': 'Eve'}, format='json')

        self.assertEqual(response.status_code, 200)
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.first_name, 'Eve')

    def test_team_list_only_contains_members(self):
        User.objects.create_user(username='outsider@x.com', email='outsider@x.com', password='x')

        emails = {u['email'] for u in self.client_for(self.employee).get('/api/auth/users/').data['results']}

        self.assertEqual(emails, {'admin@org.com', 'manager@org.com', 'employee@org.com'})

    def test_admin_changes_member_role(self):
        response = self.client_for(self.admin).patch(
            f'/api/auth/users/{self.employee.id}/', {'role': 'manager'}, format='json'
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.employee.get_tenant_role(self.tenant), 'manager')

    def test_admin_removes_member_from_organisation(self):
        response = self.client_for(self.admin).delete(f'/api/auth/users/{self.employee.id}/')

        self.assertEqual(response.status_code, 204)
        self.assertIsNone(self.employee.get_tenant_role(self.tenant))
        self.assertTrue(User.objects.filter(id=self.employee.id).exists())

    def test_admin_cannot_remove_themselves(self):
        response = self.client_for(self.admin).delete(f'/api/auth/users/{self.admin.id}/')

        self.assertEqual(response.status_code, 400)

    def test_employee_cannot_add_members(self):
        response = self.client_for(self.employee).post('/api/auth/users/', {'email': 'x@org.com'}, format='json')

        self.assertEqual(response.status_code, 403)

    def test_user_quota_of_the_plan_is_enforced(self):
        self.plan.max_users = 3
        self.plan.save()

        response = self.client_for(self.admin).post('/api/auth/users/', {
            'email': 'fourth@org.com', 'password': 'Un-Mot-De-Passe-Solide-42',
        }, format='json')

        self.assertEqual(response.status_code, 403)
        self.assertIn('limité à 3 utilisateurs', str(response.data['detail']))


class BillingAPITestCase(TenantAPITestCase):
    def test_subscription_usage_counts_tenant_members(self):
        User.objects.create_user(username='outsider@x.com', email='outsider@x.com', password='x')

        usage = self.client_for(self.employee).get('/api/billing/subscription/').data['usage']

        self.assertEqual(usage['users_count'], 3)
        self.assertEqual(usage['max_users'], 10)

    def test_plans_are_listed(self):
        names = [p['name'] for p in self.client_for(self.employee).get('/api/billing/plans/').data]

        self.assertIn('team', names)

    @patch('apps.billing.views.create_cinetpay_payment', return_value={'success': True, 'payment_url': 'https://pay'})
    def test_admin_starts_checkout(self, create_payment):
        response = self.client_for(self.admin).post('/api/billing/checkout/', {'plan_id': self.plan.id}, format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['payment_url'], 'https://pay')
        create_payment.assert_called_once()

    def test_checkout_validation(self):
        client = self.client_for(self.admin)

        self.assertEqual(client.post('/api/billing/checkout/', {}, format='json').status_code, 400)
        self.assertEqual(client.post('/api/billing/checkout/', {'plan_id': 999999}, format='json').status_code, 404)
        self.assertEqual(
            self.client_for(self.employee).post('/api/billing/checkout/', {'plan_id': self.plan.id}, format='json').status_code,
            403,
        )

    def test_expired_subscription_makes_tenant_read_only(self):
        self.subscription.status = 'past_due'
        self.subscription.current_period_end = date.today() - timedelta(days=1)
        self.subscription.save()
        client = self.client_for(self.manager)

        self.assertEqual(client.post('/api/projects/', {'name': 'Bloqué'}, format='json').status_code, 402)
        self.assertEqual(client.get('/api/projects/').status_code, 200)

    @patch('apps.billing.views.verify_cinetpay_transaction')
    def test_webhook_activates_subscription_once(self, verify):
        pro = Plan.objects.create(name='pro-test', price_monthly=15000, max_users=25, max_projects=30)
        verify.return_value = {'data': {'status': 'ACCEPTED', 'metadata': str(pro.id)}}
        transaction_id = f'sub-{self.subscription.id}-{self.tenant.schema_name}-123'
        view = CinetPayWebhookView.as_view()

        def call():
            return view(APIRequestFactory().post('/webhook/', {'cpm_trans_id': transaction_id}, format='json'))

        call()
        self.subscription.refresh_from_db()
        first_period_end = self.subscription.current_period_end
        call()
        self.subscription.refresh_from_db()

        self.assertEqual(self.subscription.plan, pro)
        self.assertEqual(self.subscription.provider_reference, transaction_id)
        self.assertEqual(self.subscription.current_period_end, first_period_end)

    def test_webhook_requires_transaction_id(self):
        response = CinetPayWebhookView.as_view()(APIRequestFactory().post('/webhook/', {}, format='json'))

        self.assertEqual(response.status_code, 400)


class TenantInfoAPITestCase(TenantAPITestCase):
    def test_current_tenant(self):
        data = APIClient(HTTP_HOST=self.get_test_tenant_domain()).get('/api/tenants/current/').data

        self.assertEqual(data['name'], 'API Test Org')

    def test_registration_is_refused_from_a_tenant_subdomain(self):
        response = APIClient(HTTP_HOST=self.get_test_tenant_domain()).post('/api/tenants/register/', {}, format='json')

        self.assertEqual(response.status_code, 403)
