import contextlib
from datetime import date, timedelta

from django.conf import settings
from django.db import connection
from django_tenants.utils import schema_context
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import TenantMembership, User
from apps.billing.defaults import ensure_default_plans
from apps.billing.models import Plan, Subscription
from apps.core import supabase, turnstile
from apps.core.throttling import RegistrationRateThrottle

from .models import Client, Domain
from .serializers import TenantRegistrationSerializer


class TenantRegistrationView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegistrationRateThrottle]

    def post(self, request):
        # L'inscription n'est autorisée que depuis le site principal (schéma public)
        current_tenant = getattr(connection, "tenant", None)
        if current_tenant and current_tenant.schema_name != "public":
            return Response(
                {"error": "La création d'une organisation n'est disponible que depuis le site principal."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if not turnstile.verify(request.data.get("turnstile_token"), request.META.get("REMOTE_ADDR")):
            return Response(
                {"error": "La vérification anti-robot a échoué. Rechargez la page et réessayez."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = TenantRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        subdomain = data["subdomain"]
        org_name = data["organization_name"]
        admin_email = data["admin_email"].lower()

        if User.objects.filter(email__iexact=admin_email).exists():
            return Response(
                {
                    "admin_email": [
                        "Un compte existe déjà avec cet email. Connectez-vous à votre organisation existante."
                    ]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        names = data["admin_name"].split(" ", 1)
        first_name = names[0]
        last_name = names[1] if len(names) > 1 else ""

        # Le compte Supabase est cree en premier : sans lui l'admin ne pourrait pas se connecter
        try:
            supabase_id = supabase.create_auth_user(
                admin_email, data["admin_password"], {"first_name": first_name, "last_name": last_name}
            )
        except supabase.SupabaseError as exc:
            if exc.status_code == 422:
                return Response(
                    {"admin_email": ["Un compte existe déjà avec cet email."]}, status=status.HTTP_400_BAD_REQUEST
                )
            return Response(
                {"error": "Le service d'authentification est indisponible. Réessayez plus tard."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            client, primary_domain = self._provision_tenant(
                subdomain, org_name, admin_email, first_name, last_name, data["admin_password"], supabase_id
            )
        except Exception:
            with contextlib.suppress(supabase.SupabaseError):
                supabase.delete_auth_user(supabase_id)
            raise

        # En local, le sous-domaine de production n'est pas joignable : on renvoie vers *.localhost
        host, _, port = request.get_host().partition(":")
        if host == "localhost" or host.endswith(".localhost"):
            login_url = f"http://{subdomain}.localhost{':' + port if port else ''}/login"
        else:
            login_url = f"https://{primary_domain}/login"

        return Response(
            {
                "message": "Organisation créée avec succès.",
                "tenant": {
                    "name": client.name,
                    "subdomain": subdomain,
                    "domain": primary_domain,
                },
                "login_url": login_url,
            },
            status=status.HTTP_201_CREATED,
        )

    def _provision_tenant(self, subdomain, org_name, admin_email, first_name, last_name, password, supabase_id):
        with schema_context("public"):
            client = Client(schema_name=subdomain, name=org_name, plan="free", is_active=True)
            client.save()

            try:
                primary_domain = f"{subdomain}.{settings.PLATFORM_DOMAIN}"
                Domain.objects.create(domain=primary_domain, tenant=client, is_primary=True)
                Domain.objects.create(domain=f"{subdomain}.localhost", tenant=client, is_primary=False)

                # Essai du plan Pro, puis retour automatique au plan gratuit (apps.billing.tasks)
                ensure_default_plans()
                Subscription.objects.create(
                    tenant=client,
                    plan=Plan.objects.get(name="pro"),
                    status="trial",
                    current_period_end=date.today() + timedelta(days=settings.BILLING_TRIAL_DAYS),
                )
                client.plan = "pro"
                client.save(update_fields=["plan"])

                user = User.objects.create_user(
                    username=admin_email,
                    email=admin_email,
                    first_name=first_name,
                    last_name=last_name,
                    password=password,
                    role="admin",
                    supabase_id=supabase_id,
                )
                TenantMembership.objects.create(user=user, tenant=client, role="admin", is_active=True)
            except Exception:
                # Supprime le schema cree pour ne pas laisser une organisation orpheline
                client.delete(force_drop=True)
                raise

        return client, primary_domain


class CurrentTenantView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        tenant = getattr(connection, "tenant", None)
        if not tenant:
            return Response({"error": "Aucun tenant actif"}, status=status.HTTP_404_NOT_FOUND)

        return Response(
            {
                "name": tenant.name,
                "schema_name": tenant.schema_name,
                "plan": getattr(tenant, "plan", "free"),
                "is_active": getattr(tenant, "is_active", True),
            }
        )
