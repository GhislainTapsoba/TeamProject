"""Enforcement of the per-plan quotas (max_users, max_projects)."""

from apps.accounts.models import TenantMembership


def _plan(tenant):
    subscription = getattr(tenant, "subscription", None)
    return subscription.plan if subscription else None


def users_count(tenant):
    return TenantMembership.objects.filter(tenant=tenant, is_active=True).count()


def projects_count():
    # Projects live in the tenant schema: the active connection already scopes them
    from apps.projects.models import Project

    return Project.objects.count()


def user_limit_error(tenant):
    plan = _plan(tenant)
    if plan and users_count(tenant) >= plan.max_users:
        return (
            f"Votre plan {plan.display_name or plan.name} est limité à {plan.max_users} utilisateurs. "
            "Passez à un plan supérieur dans Paramètres > Facturation."
        )
    return None


def project_limit_error(tenant):
    plan = _plan(tenant)
    if plan and projects_count() >= plan.max_projects:
        return (
            f"Votre plan {plan.display_name or plan.name} est limité à {plan.max_projects} projets. "
            "Passez à un plan supérieur dans Paramètres > Facturation."
        )
    return None
