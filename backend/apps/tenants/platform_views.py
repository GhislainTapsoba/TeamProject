"""
Platform console API (super-admins only), served on the public schema.

It gives the platform owner a read view of every organization and a few
operational actions (suspend, reactivate, extend/change plan). Every action is
written to PlatformAuditLog. Nothing here bypasses authentication.
"""

from datetime import date, timedelta

from django.db import transaction
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import TenantMembership
from apps.billing import limits
from apps.billing.models import Payment, Plan
from apps.core import supabase

from .models import Client, PlatformAuditLog
from .platform_auth import IsPlatformAdmin, PlatformJWTAuthentication, PlatformRateThrottle, client_ip
from .platform_serializers import (
    PlatformAuditLogSerializer,
    PlatformPaymentSerializer,
    PlatformTenantDetailSerializer,
    PlatformTenantSerializer,
)


def record_audit(request, action, target="", **detail):
    PlatformAuditLog.objects.create(
        actor_email=request.user.email,
        action=action,
        target=target,
        detail=detail,
        ip_address=client_ip(request),
    )


def _subscription_dict(sub):
    if sub is None:
        return None
    return {
        "plan": sub.plan.name,
        "plan_name": sub.plan.display_name or sub.plan.name,
        "status": sub.status,
        "current_period_end": sub.current_period_end,
        "is_expired": sub.is_expired,
        "is_read_only": sub.is_read_only,
        "days_left": sub.days_left,
    }


def _usage_dict(tenant, sub):
    with schema_context(tenant.schema_name):
        projects = limits.projects_count()
    return {
        "users_count": TenantMembership.objects.filter(tenant=tenant, is_active=True).count(),
        "max_users": sub.plan.max_users if sub else None,
        "projects_count": projects,
        "max_projects": sub.plan.max_projects if sub else None,
    }


def _primary_domain(tenant):
    domain = tenant.domains.filter(is_primary=True).first() or tenant.domains.first()
    return domain.domain if domain else ""


def _tenant_payload(tenant, sub):
    return {
        "schema_name": tenant.schema_name,
        "name": tenant.name,
        "plan": tenant.plan,
        "is_active": tenant.is_active,
        "created_at": tenant.created_at,
        "primary_domain": _primary_domain(tenant),
        "subscription": _subscription_dict(sub),
        "usage": _usage_dict(tenant, sub),
    }


class PlatformBaseView(APIView):
    authentication_classes = [PlatformJWTAuthentication]
    permission_classes = [IsPlatformAdmin]
    throttle_classes = [PlatformRateThrottle]


class PlatformOverviewView(PlatformBaseView):
    def get(self, request):
        tenants = (
            Client.objects.exclude(schema_name="public")
            .select_related("subscription", "subscription__plan")
            .prefetch_related("domains")
            .order_by("-created_at")
        )
        data = [_tenant_payload(t, getattr(t, "subscription", None)) for t in tenants]

        def count(*statuses):
            return len([t for t in data if t["subscription"] and t["subscription"]["status"] in statuses])

        # Monthly recurring revenue: paid, currently active subscriptions only
        mrr = sum(
            t.subscription.plan.price_monthly
            for t in tenants
            if getattr(t, "subscription", None) and t.subscription.status == "active"
        )
        stats = {
            "tenants": len(data),
            "active_subscriptions": count("active"),
            "trials": count("trial"),
            "past_due": count("past_due"),
            "suspended": count("cancelled"),
            "mrr_xof": mrr,
        }
        return Response({"stats": stats, "tenants": PlatformTenantSerializer(data, many=True).data})


class PlatformTenantDetailView(PlatformBaseView):
    def get(self, request, schema_name):
        tenant = Client.objects.exclude(schema_name="public").filter(schema_name=schema_name).first()
        if tenant is None:
            return Response({"detail": "Organisation introuvable."}, status=status.HTTP_404_NOT_FOUND)

        sub = getattr(tenant, "subscription", None)
        payload = _tenant_payload(tenant, sub)
        members = [
            {
                "email": m.user.email,
                "full_name": m.user.get_full_name() or m.user.username,
                "role": m.role,
                "is_active": m.is_active,
            }
            for m in TenantMembership.objects.filter(tenant=tenant).select_related("user").order_by("role")
        ]
        payments = Payment.objects.filter(tenant=tenant).select_related("plan")[:10]
        payload["members"] = members
        payload["recent_payments"] = PlatformPaymentSerializer(payments, many=True).data
        return Response(PlatformTenantDetailSerializer(payload).data)


class PlatformSuspendView(PlatformBaseView):
    def post(self, request, schema_name):
        tenant = Client.objects.exclude(schema_name="public").filter(schema_name=schema_name).first()
        if tenant is None:
            return Response({"detail": "Organisation introuvable."}, status=status.HTTP_404_NOT_FOUND)
        sub = getattr(tenant, "subscription", None)
        if sub is None:
            return Response({"detail": "Aucun abonnement."}, status=status.HTTP_400_BAD_REQUEST)

        suspend = request.data.get("suspend", True)
        sub.status = "cancelled" if suspend else "active"
        tenant.is_active = not suspend
        with transaction.atomic():
            sub.save(update_fields=["status", "updated_at"])
            tenant.save(update_fields=["is_active"])
        record_audit(request, "suspend_tenant" if suspend else "reactivate_tenant", schema_name, suspend=bool(suspend))
        return Response({"status": sub.status, "is_active": tenant.is_active})


class PlatformExtendView(PlatformBaseView):
    def post(self, request, schema_name):
        tenant = Client.objects.exclude(schema_name="public").filter(schema_name=schema_name).first()
        if tenant is None:
            return Response({"detail": "Organisation introuvable."}, status=status.HTTP_404_NOT_FOUND)
        sub = getattr(tenant, "subscription", None)
        if sub is None:
            return Response({"detail": "Aucun abonnement."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            days = int(request.data.get("days", 30))
        except (TypeError, ValueError):
            return Response({"detail": "Nombre de jours invalide."}, status=status.HTTP_400_BAD_REQUEST)
        if not 1 <= days <= 3650:
            return Response({"detail": "Entre 1 et 3650 jours."}, status=status.HTTP_400_BAD_REQUEST)

        plan_name = request.data.get("plan")
        old_plan = sub.plan.name
        if plan_name and plan_name != sub.plan.name:
            plan = Plan.objects.filter(name=plan_name).first()
            if plan is None:
                return Response({"detail": "Plan introuvable."}, status=status.HTTP_404_NOT_FOUND)
            sub.plan = plan
            tenant.plan = plan.name

        start = max(sub.current_period_end, date.today())
        sub.current_period_end = start + timedelta(days=days)
        sub.status = "active"
        with transaction.atomic():
            sub.save()
            tenant.save(update_fields=["plan"])
        record_audit(request, "extend_subscription", schema_name, days=days, old_plan=old_plan, new_plan=sub.plan.name)
        return Response(_subscription_dict(sub))


class PlatformPaymentsView(PlatformBaseView):
    def get(self, request):
        payments = Payment.objects.select_related("tenant", "plan").order_by("-created_at")
        status_filter = request.query_params.get("status")
        if status_filter:
            payments = payments.filter(status=status_filter)
        return Response(PlatformPaymentSerializer(payments[:100], many=True).data)


class PlatformAuditView(PlatformBaseView):
    def get(self, request):
        logs = PlatformAuditLog.objects.all()[:200]
        return Response(PlatformAuditLogSerializer(logs, many=True).data)


class PlatformResetPasswordView(PlatformBaseView):
    """Trigger a password reset for a member of an organization (support)."""

    def post(self, request, schema_name):
        email = (request.data.get("email") or "").lower()
        new_password = request.data.get("new_password") or ""
        if len(new_password) < 12:
            return Response({"detail": "Le mot de passe doit faire au moins 12 caractères."}, status=400)

        tenant = Client.objects.exclude(schema_name="public").filter(schema_name=schema_name).first()
        if tenant is None:
            return Response({"detail": "Organisation introuvable."}, status=status.HTTP_404_NOT_FOUND)
        membership = (
            TenantMembership.objects.filter(tenant=tenant, user__email__iexact=email).select_related("user").first()
        )
        if membership is None:
            return Response({"detail": "Ce membre n'appartient pas à cette organisation."}, status=404)

        user = membership.user
        if not user.supabase_id:
            return Response({"detail": "Ce compte n'a pas d'identité Supabase."}, status=400)
        try:
            supabase.update_auth_user_password(str(user.supabase_id), new_password)
        except supabase.SupabaseError:
            return Response({"detail": "Service d'authentification indisponible."}, status=503)
        user.set_password(new_password)
        user.save(update_fields=["password"])
        record_audit(request, "reset_member_password", schema_name, email=email)
        return Response({"detail": "Mot de passe réinitialisé."})
