"""
Subscription payments.

Flow: ``start_checkout`` records a pending Payment and returns the provider's
checkout URL. The payment is confirmed either by the provider webhook or when
the customer comes back (``refresh_payment``); both re-verify the transaction
server-side and go through ``apply_payment``, which is idempotent.

Providers:
- ``cinetpay``: Orange Money, Moov Money, Wave and cards (XOF).
- ``mock``: local checkout page to test the whole flow without real money.
  Only available when DEBUG is on.
"""

import logging
import uuid
from datetime import date, timedelta
from decimal import Decimal

import requests
from django.conf import settings
from django.db import transaction
from django.urls import reverse
from django.utils import timezone

from .models import Payment, Plan, Subscription

logger = logging.getLogger(__name__)

BILLING_PERIOD_DAYS = 30


class BillingError(Exception):
    pass


def active_provider():
    provider = settings.BILLING_PROVIDER
    if provider == "mock" and not settings.DEBUG:
        raise BillingError("Le paiement de test est désactivé en production.")
    return provider


def start_checkout(tenant, plan, request):
    """Create a pending payment for ``plan`` and return it with its checkout URL."""
    if plan.is_free:
        raise BillingError("Le plan gratuit ne nécessite pas de paiement.")

    provider = active_provider()
    payment = Payment.objects.create(
        tenant=tenant,
        plan=plan,
        provider=provider,
        transaction_id=f"TP{uuid.uuid4().hex[:20].upper()}",
        amount=plan.price_monthly,
    )
    return_url = request.build_absolute_uri(reverse("billing_return")) + f"?tx={payment.transaction_id}"

    if provider == "mock":
        payment.payment_url = request.build_absolute_uri(
            reverse("billing_mock_checkout", args=[payment.transaction_id])
        )
    else:
        payment.payment_url = _cinetpay_checkout_url(payment, return_url)
    payment.save(update_fields=["payment_url"])
    return payment


def _cinetpay_checkout_url(payment, return_url):
    payload = {
        "apikey": settings.CINETPAY_API_KEY,
        "site_id": settings.CINETPAY_SITE_ID,
        "transaction_id": payment.transaction_id,
        "amount": int(payment.amount),
        "currency": payment.currency,
        "description": f"Abonnement {payment.plan.display_name or payment.plan.name} - {payment.tenant.name}",
        "notify_url": f"{settings.FRONTEND_URL}/api/billing/cinetpay/webhook/",
        "return_url": return_url,
        "channels": "ALL",
        "metadata": str(payment.plan_id),
    }
    try:
        response = requests.post(settings.CINETPAY_CHECKOUT_URL, json=payload, timeout=15)
        body = response.json()
    except (requests.RequestException, ValueError) as exc:
        payment.status = "failed"
        payment.save(update_fields=["status"])
        logger.warning("CinetPay checkout failed for %s: %s", payment.transaction_id, exc)
        raise BillingError("Le service de paiement est indisponible. Réessayez dans quelques instants.") from exc

    url = (body.get("data") or {}).get("payment_url")
    if body.get("code") != "201" or not url:
        payment.status = "failed"
        payment.save(update_fields=["status"])
        logger.warning("CinetPay refused checkout %s: %s", payment.transaction_id, body)
        raise BillingError(body.get("description") or body.get("message") or "Paiement refusé par CinetPay.")
    return url


def verify_cinetpay_transaction(transaction_id):
    """Ask CinetPay for the real status of a transaction. Never trust the webhook body alone."""
    payload = {
        "apikey": settings.CINETPAY_API_KEY,
        "site_id": settings.CINETPAY_SITE_ID,
        "transaction_id": transaction_id,
    }
    try:
        response = requests.post(settings.CINETPAY_CHECK_URL, json=payload, timeout=15)
        return response.json()
    except (requests.RequestException, ValueError) as exc:
        return {"status": "ERROR", "message": str(exc)}


def refresh_payment(payment):
    """Re-check a CinetPay payment with the provider and apply the result."""
    # A payment marked failed (abandoned) can still be confirmed later by CinetPay: money taken must be applied
    if payment.status == "paid" or payment.provider != "cinetpay":
        return payment

    data = verify_cinetpay_transaction(payment.transaction_id).get("data") or {}
    status = data.get("status")
    if status == "ACCEPTED":
        paid_amount = Decimal(str(data.get("amount") or 0))
        if paid_amount < payment.amount or (data.get("currency") or payment.currency) != payment.currency:
            logger.error("Amount mismatch for %s: %s %s", payment.transaction_id, paid_amount, data.get("currency"))
            return mark_failed(payment)
        return apply_payment(payment)
    if status in ("REFUSED", "CANCELED", "CANCELLED"):
        return mark_failed(payment)
    return payment


def mark_failed(payment):
    Payment.objects.filter(pk=payment.pk, status="pending").update(status="failed")
    payment.refresh_from_db()
    return payment


def apply_payment(payment):
    """Mark the payment as paid and extend the subscription. Safe to call several times."""
    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(pk=payment.pk)
        if payment.status == "paid":
            return payment

        subscription = Subscription.objects.select_for_update().filter(tenant=payment.tenant).first()
        today = date.today()
        if subscription is None:
            subscription = Subscription(tenant=payment.tenant, plan=payment.plan, current_period_end=today)

        # Renewing the same paid plan stacks the new month; changing plan starts a new period today
        same_plan = subscription.plan_id == payment.plan_id and subscription.status in ("active", "past_due")
        start = max(subscription.current_period_end, today) if same_plan else today

        subscription.plan = payment.plan
        subscription.status = "active"
        subscription.current_period_end = start + timedelta(days=BILLING_PERIOD_DAYS)
        subscription.payment_provider = payment.provider
        subscription.provider_reference = payment.transaction_id
        subscription.save()

        payment.tenant.plan = payment.plan.name
        payment.tenant.save(update_fields=["plan"])

        payment.status = "paid"
        payment.paid_at = timezone.now()
        payment.period_end = subscription.current_period_end
        payment.save(update_fields=["status", "paid_at", "period_end"])
    return payment


def free_plan():
    plan = Plan.objects.filter(name="free").first()
    if plan is None:
        plan = Plan.objects.create(name="free", display_name="Gratuit", price_monthly=0, max_users=5, max_projects=3)
    return plan
