from rest_framework import serializers

from . import limits
from .models import Payment, Plan, Subscription


class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ("id", "name", "display_name", "price_monthly", "max_users", "max_projects", "features")


class SubscriptionSerializer(serializers.ModelSerializer):
    plan_details = PlanSerializer(source="plan", read_only=True)
    is_expired = serializers.ReadOnlyField()
    is_read_only = serializers.ReadOnlyField()
    days_left = serializers.ReadOnlyField()
    grace_until = serializers.ReadOnlyField()
    usage = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = (
            "id",
            "plan",
            "plan_details",
            "status",
            "current_period_end",
            "is_expired",
            "is_read_only",
            "days_left",
            "grace_until",
            "payment_provider",
            "usage",
            "created_at",
        )

    def get_usage(self, obj):
        return {
            "users_count": limits.users_count(obj.tenant),
            "max_users": obj.plan.max_users,
            "projects_count": limits.projects_count(),
            "max_projects": obj.plan.max_projects,
        }


class PaymentSerializer(serializers.ModelSerializer):
    plan_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            "transaction_id",
            "plan",
            "plan_name",
            "provider",
            "amount",
            "currency",
            "status",
            "period_end",
            "created_at",
            "paid_at",
        )

    def get_plan_name(self, obj):
        return obj.plan.display_name or obj.plan.name
