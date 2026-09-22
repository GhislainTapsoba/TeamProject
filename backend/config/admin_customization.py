from django.contrib import admin
from django.urls import reverse


def build_dashboard_stats():
    from apps.accounts.models import User
    from apps.billing.models import Subscription
    from apps.projects.models import Project, Task
    from apps.tenants.models import Client
    from apps.notifications.models import Notification

    return [
        {
            'label': 'Clients',
            'value': Client.objects.count(),
            'url': reverse('admin:tenants_client_changelist'),
            'short': 'C',
        },
        {
            'label': 'Utilisateurs',
            'value': User.objects.count(),
            'url': reverse('admin:accounts_user_changelist'),
            'short': 'U',
        },
        {
            'label': 'Projets',
            'value': Project.objects.count(),
            'url': reverse('admin:projects_project_changelist'),
            'short': 'P',
        },
        {
            'label': 'Tâches',
            'value': Task.objects.count(),
            'url': reverse('admin:projects_task_changelist'),
            'short': 'T',
        },
        {
            'label': 'Abonnements',
            'value': Subscription.objects.count(),
            'url': reverse('admin:billing_subscription_changelist'),
            'short': 'A',
        },
        {
            'label': 'Notifications',
            'value': Notification.objects.count(),
            'url': reverse('admin:notifications_notification_changelist'),
            'short': 'N',
        },
    ]


def build_recent_activity():
    from apps.projects.models import Project, Task
    from apps.tenants.models import Client
    from apps.accounts.models import User

    return [
        {
            'title': 'Clients récents',
            'items': list(Client.objects.order_by('-created_at')[:5]),
        },
        {
            'title': 'Projets récents',
            'items': list(Project.objects.order_by('-created_at')[:5]),
        },
        {
            'title': 'Utilisateurs récents',
            'items': list(User.objects.order_by('-date_joined')[:5]),
        },
        {
            'title': 'Tâches récentes',
            'items': list(Task.objects.order_by('-created_at')[:5]),
        },
    ]


def apply_admin_dashboard():
    original_index = admin.site.index

    def custom_index(self, request, extra_context=None):
        context = dict(extra_context or {})
        context['dashboard_stats'] = build_dashboard_stats()
        context['recent_activity'] = build_recent_activity()
        return original_index(request, extra_context=context)

    admin.site.index = custom_index.__get__(admin.site, type(admin.site))
