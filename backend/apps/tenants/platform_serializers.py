from rest_framework import serializers

from apps.billing.models import Payment

from .models import PlatformAuditLog


class PlatformTenantSerializer(serializers.Serializer):
    schema_name = serializers.CharField()
    name = serializers.CharField()
    plan = serializers.CharField()
    is_active = serializers.BooleanField()
    created_at = serializers.DateTimeField()
    primary_domain = serializers.CharField()
    subscription = serializers.DictField()
    usage = serializers.DictField()


class PlatformTenantDetailSerializer(PlatformTenantSerializer):
    members = serializers.ListField()
    recent_payments = serializers.ListField()


class PlatformPaymentSerializer(serializers.ModelSerializer):
    tenant = serializers.CharField(source="tenant.schema_name", read_only=True)
    tenant_name = serializers.CharField(source="tenant.name", read_only=True)
    plan_name = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = (
            "transaction_id",
            "tenant",
            "tenant_name",
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


class PlatformAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformAuditLog
        fields = ("id", "actor_email", "action", "target", "detail", "ip_address", "created_at")
