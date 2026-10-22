"""
Subscription lifecycle, run periodically by Celery beat.

- J-3 before the end of a paid period: reminder to the organization admins.
- End of a paid period: ``past_due`` with full access during BILLING_GRACE_DAYS.
- End of the grace period or of the trial: back to the free plan (data is kept,
  the free quotas apply again).
- Checkouts abandoned for more than a day are marked failed.
"""

import logging
from datetime import date, timedelta

from celery import shared_task
from django.conf import settings
from django.utils import timezone
from django_tenants.utils import schema_context

from apps.accounts.models import TenantMembership

from .models import Payment, Subscription
from .services import free_plan

logger = logging.getLogger(__name__)

REMINDER_DAYS = 3


def notify_admins(tenant, message):
    from apps.notifications.models import Notification

    admin_ids = list(
        TenantMembership.objects.filter(tenant=tenant, role="admin", is_active=True).values_list("user_id", flat=True)
    )
    with schema_context(tenant.schema_name):
        Notification.objects.bulk_create(
            [Notification(user_id=user_id, channel="in_app", message=message[:255]) for user_id in admin_ids]
        )


def _downgrade(subscription, reason):
    plan = free_plan()
    old_plan = subscription.plan.display_name or subscription.plan.name
    subscription.plan = plan
    subscription.status = "active"
    subscription.current_period_end = date.today()
    subscription.save()
    subscription.tenant.plan = plan.name
    subscription.tenant.save(update_fields=["plan"])
    notify_admins(
        subscription.tenant,
        f"{reason} Votre organisation est repassée du plan {old_plan} au plan Gratuit. "
        "Vos données sont conservées. Réabonnez-vous dans Paramètres > Facturation.",
    )


@shared_task
def check_subscriptions():
    today = date.today()
    grace = timedelta(days=settings.BILLING_GRACE_DAYS)
    counts = {"reminded": 0, "past_due": 0, "downgraded": 0}

    subscriptions = Subscription.objects.select_related("plan", "tenant").exclude(plan__price_monthly__lte=0)
    for sub in subscriptions:
        try:
            if sub.status == "trial" and sub.current_period_end < today:
                _downgrade(sub, "Votre période d'essai est terminée.")
                counts["downgraded"] += 1
            elif sub.status == "active" and sub.current_period_end < today:
                sub.status = "past_due"
                sub.save(update_fields=["status", "updated_at"])
                notify_admins(
                    sub.tenant,
                    f"Votre abonnement a expiré le {sub.current_period_end:%d/%m/%Y}. "
                    f"Renouvelez-le avant le {sub.current_period_end + grace:%d/%m/%Y} pour garder votre plan.",
                )
                counts["past_due"] += 1
            elif sub.status == "past_due" and sub.current_period_end + grace < today:
                _downgrade(sub, "Votre abonnement n'a pas été renouvelé.")
                counts["downgraded"] += 1
            elif (
                sub.status in ("active", "trial")
                and today <= sub.current_period_end <= today + timedelta(days=REMINDER_DAYS)
                and sub.reminder_sent_for != sub.current_period_end
            ):
                what = "Votre période d'essai" if sub.status == "trial" else "Votre abonnement"
                notify_admins(
                    sub.tenant,
                    f"{what} se termine le {sub.current_period_end:%d/%m/%Y}. "
                    "Renouvelez-le dans Paramètres > Facturation pour éviter toute interruption.",
                )
                sub.reminder_sent_for = sub.current_period_end
                sub.save(update_fields=["reminder_sent_for", "updated_at"])
                counts["reminded"] += 1
        except Exception:
            # One broken tenant must not block the others
            logger.exception("Subscription check failed for tenant %s", sub.tenant.schema_name)

    stale = timezone.now() - timedelta(days=1)
    counts["abandoned"] = Payment.objects.filter(status="pending", created_at__lt=stale).update(status="failed")
    return counts
