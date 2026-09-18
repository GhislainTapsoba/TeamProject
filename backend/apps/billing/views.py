from datetime import date, timedelta
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import connection
from .models import Plan, Subscription
from .serializers import PlanSerializer, SubscriptionSerializer
from .services import create_cinetpay_payment, verify_cinetpay_transaction
from apps.core.permissions import IsTenantAdmin

class PlanListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        plans = Plan.objects.all().order_by('price_monthly')
        # Seed default plans if empty
        if not plans.exists():
            Plan.objects.create(
                name="free", display_name="Gratuit", price_monthly=0,
                max_users=5, max_projects=3,
                features=["Jusqu'à 5 utilisateurs", "3 projets actifs", "Vue Kanban interactive", "Notifications in-app"]
            )
            Plan.objects.create(
                name="pro", display_name="Professionnel", price_monthly=15000,
                max_users=25, max_projects=30,
                features=["Jusqu'à 25 utilisateurs", "30 projets", "Emails Mailjet transactionnels", "Support prioritaire", "Vue Kanban & Rapports"]
            )
            Plan.objects.create(
                name="enterprise", display_name="Entreprise", price_monthly=45000,
                max_users=100, max_projects=200,
                features=["Utilisateurs illimités", "Projets illimités", "Logs d'audit & sécurité avancée", "Accompagnement dédié"]
            )
            plans = Plan.objects.all().order_by('price_monthly')
        return Response(PlanSerializer(plans, many=True).data)

class CurrentSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant = getattr(connection, 'tenant', None)
        if not tenant:
            return Response({'error': 'Aucun tenant actif'}, status=status.HTTP_404_NOT_FOUND)
        
        sub = getattr(tenant, 'subscription', None)
        if not sub:
            # Fallback create free subscription
            plan = Plan.objects.filter(name='free').first()
            if not plan:
                plan = Plan.objects.create(name='free', display_name='Gratuit', price_monthly=0, max_users=5, max_projects=3)
            sub = Subscription.objects.create(
                tenant=tenant,
                plan=plan,
                status='active',
                current_period_end=date.today() + timedelta(days=365)
            )
        return Response(SubscriptionSerializer(sub).data)

class InitiateCheckoutView(APIView):
    permission_classes = [IsTenantAdmin]

    def post(self, request):
        tenant = getattr(connection, 'tenant', None)
        if not tenant:
            return Response({'error': 'Aucun tenant actif'}, status=status.HTTP_404_NOT_FOUND)

        plan_id = request.data.get('plan_id')
        if not plan_id:
            return Response({'error': 'plan_id requis'}, status=status.HTTP_400_BAD_REQUEST)

        plan = Plan.objects.filter(id=plan_id).first()
        if not plan:
            return Response({'error': 'Plan introuvable'}, status=status.HTTP_404_NOT_FOUND)

        sub = getattr(tenant, 'subscription', None)
        if not sub:
            sub = Subscription.objects.create(
                tenant=tenant,
                plan=plan,
                status='active',
                current_period_end=date.today()
            )

        return_url = request.data.get('return_url')
        payment_data = create_cinetpay_payment(sub, plan, return_url=return_url)

        return Response(payment_data)

class CinetPayWebhookView(APIView):
    """
    Public webhook called by CinetPay on payment confirmation.
    Re-verifies transaction with CinetPay API to prevent forged requests.
    Processes idempotently.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        transaction_id = request.data.get('cpm_trans_id') or request.data.get('transaction_id')
        if not transaction_id:
            return Response({'error': 'Missing transaction_id'}, status=status.HTTP_400_BAD_REQUEST)

        # Server-side verification with CinetPay
        check_result = verify_cinetpay_transaction(transaction_id)
        data = check_result.get('data', {})
        status_code = data.get('status')

        if status_code == 'ACCEPTED':
            # Format: sub-{sub_id}-{schema}-{timestamp}
            parts = transaction_id.split('-')
            if len(parts) >= 2:
                sub_id = parts[1]
                subscription = Subscription.objects.filter(id=sub_id).first()
                if subscription:
                    # Idempotent handling
                    if subscription.provider_reference != transaction_id:
                        subscription.status = 'active'
                        subscription.provider_reference = transaction_id
                        # Extend period by 30 days
                        subscription.current_period_end = max(subscription.current_period_end, date.today()) + timedelta(days=30)
                        
                        # Upgrade plan if metadata specified target plan id
                        meta_plan_id = data.get('metadata')
                        if meta_plan_id:
                            target_plan = Plan.objects.filter(id=meta_plan_id).first()
                            if target_plan:
                                subscription.plan = target_plan
                                subscription.tenant.plan = target_plan.name
                                subscription.tenant.save()

                        subscription.save()

        return Response({'status': 'OK'}, status=status.HTTP_200_OK)
