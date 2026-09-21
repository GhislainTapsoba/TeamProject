from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from django_tenants.utils import schema_context
from django.conf import settings
from django.db import connection
from .models import Client, Domain
from .serializers import ClientSerializer, TenantRegistrationSerializer
from apps.accounts.models import User, TenantMembership
from apps.billing.models import Plan, Subscription
from apps.core.throttling import RegistrationRateThrottle
from datetime import date, timedelta

class TenantRegistrationView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [RegistrationRateThrottle]

    def post(self, request):
        # L'inscription n'est autorisée que depuis le site principal (schéma public)
        current_tenant = getattr(connection, 'tenant', None)
        if current_tenant and current_tenant.schema_name != 'public':
            return Response(
                {'error': "La création d'une organisation n'est disponible que depuis le site principal."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = TenantRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        subdomain = data['subdomain']
        org_name = data['organization_name']

        with schema_context('public'):
            client = Client(
                schema_name=subdomain,
                name=org_name,
                plan='free',
                is_active=True
            )
            client.save()

            primary_domain = f"{subdomain}.{settings.PLATFORM_DOMAIN}"
            Domain.objects.create(domain=primary_domain, tenant=client, is_primary=True)
            Domain.objects.create(domain=f"{subdomain}.localhost", tenant=client, is_primary=False)

            default_plan = Plan.objects.filter(name='free').first()
            if not default_plan:
                default_plan = Plan.objects.create(
                    name='free',
                    price_monthly=0,
                    max_users=5,
                    max_projects=3
                )

            Subscription.objects.create(
                tenant=client,
                plan=default_plan,
                status='trial',
                current_period_end=date.today() + timedelta(days=14)
            )

        with schema_context(client.schema_name):
            names = data['admin_name'].split(' ', 1)
            first_name = names[0]
            last_name = names[1] if len(names) > 1 else ''

            user = User.objects.create_user(
                username=data['admin_email'],
                email=data['admin_email'],
                first_name=first_name,
                last_name=last_name,
                password=data['admin_password'],
                role='admin',
                is_staff=True
            )

        with schema_context('public'):
            TenantMembership.objects.create(user=user, tenant=client, role='admin', is_active=True)

        return Response({
            'message': 'Organisation créée avec succès.',
            'tenant': {
                'name': client.name,
                'subdomain': subdomain,
                'domain': primary_domain,
            },
            'login_url': f"https://{primary_domain}/login"
        }, status=status.HTTP_201_CREATED)

class CurrentTenantView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        tenant = getattr(connection, 'tenant', None)
        if not tenant:
            return Response({'error': 'Aucun tenant actif'}, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'name': tenant.name,
            'schema_name': tenant.schema_name,
            'plan': getattr(tenant, 'plan', 'free'),
            'is_active': getattr(tenant, 'is_active', True),
        })