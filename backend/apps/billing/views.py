from django.conf import settings
from django.db import connection
from django.http import Http404
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsTenantAdmin

from . import services
from .defaults import ensure_default_plans
from .models import Payment, Plan, Subscription
from .serializers import PaymentSerializer, PlanSerializer, SubscriptionSerializer


def _tenant():
    tenant = getattr(connection, "tenant", None)
    if tenant is None or tenant.schema_name == "public":
        raise Http404("Aucune organisation active.")
    return tenant


class PlanListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        if not Plan.objects.exists():
            ensure_default_plans()
        plans = Plan.objects.order_by("price_monthly")
        return Response(PlanSerializer(plans, many=True).data)


class CurrentSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = _tenant()
        sub = Subscription.objects.select_related("plan").filter(tenant=tenant).first()
        if sub is None:
            sub = Subscription.objects.create(
                tenant=tenant, plan=services.free_plan(), status="active", current_period_end=tenant.created_at.date()
            )
        return Response(SubscriptionSerializer(sub).data)


class InitiateCheckoutView(APIView):
    permission_classes = [IsTenantAdmin]

    def post(self, request):
        tenant = _tenant()
        plan = Plan.objects.filter(id=request.data.get("plan_id")).first()
        if plan is None:
            return Response({"error": "Plan introuvable."}, status=status.HTTP_404_NOT_FOUND)

        try:
            payment = services.start_checkout(tenant, plan, request)
        except services.BillingError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {"transaction_id": payment.transaction_id, "payment_url": payment.payment_url},
            status=status.HTTP_201_CREATED,
        )


class PaymentListView(APIView):
    permission_classes = [IsTenantAdmin]

    def get(self, request):
        payments = Payment.objects.filter(tenant=_tenant()).select_related("plan")[:24]
        return Response(PaymentSerializer(payments, many=True).data)


class PaymentDetailView(APIView):
    """Status of one payment; re-checks it with the provider while it is not confirmed."""

    permission_classes = [IsTenantAdmin]

    def get(self, request, transaction_id):
        payment = get_object_or_404(
            Payment.objects.select_related("plan"), tenant=_tenant(), transaction_id=transaction_id
        )
        payment = services.refresh_payment(payment)
        return Response(PaymentSerializer(payment).data)


# No state change here (only a redirect), and CinetPay posts without a CSRF token
@csrf_exempt
@require_http_methods(["GET", "POST"])
def payment_return(request):
    """Customer comes back from the checkout (CinetPay may POST here): send them to the billing page."""
    transaction_id = request.GET.get("tx") or request.POST.get("transaction_id") or ""
    target = "/settings/billing"
    if transaction_id.isalnum():
        target += f"?payment={transaction_id}"
    return redirect(target)


@require_http_methods(["GET", "POST"])
def mock_checkout(request, transaction_id):
    """Fake payment page to test the subscription flow locally (DEBUG only)."""
    if not settings.DEBUG:
        raise Http404
    payment = get_object_or_404(Payment.objects.select_related("plan", "tenant"), transaction_id=transaction_id)
    if payment.tenant_id != _tenant().id or payment.provider != "mock":
        raise Http404

    if request.method == "POST":
        if payment.status == "pending":
            if request.POST.get("action") == "pay":
                services.apply_payment(payment)
            else:
                services.mark_failed(payment)
        return redirect(f"/api/billing/return/?tx={payment.transaction_id}")
    return render(request, "billing/mock_checkout.html", {"payment": payment})


class CinetPayWebhookView(APIView):
    """
    Public notification endpoint called by CinetPay.
    The body is never trusted: the transaction is re-verified with the CinetPay API.
    """

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        # CinetPay checks that the URL is reachable
        return Response({"status": "OK"})

    def post(self, request):
        transaction_id = request.data.get("cpm_trans_id") or request.data.get("transaction_id")
        if not transaction_id:
            return Response({"error": "Missing transaction_id"}, status=status.HTTP_400_BAD_REQUEST)

        payment = Payment.objects.filter(transaction_id=transaction_id, provider="cinetpay").first()
        if payment is not None:
            services.refresh_payment(payment)
        return Response({"status": "OK"})
