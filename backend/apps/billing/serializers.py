from rest_framework import serializers
from .models import Plan, Subscription
from apps.accounts.models import User
from apps.projects.models import Project

class PlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plan
        fields = ('id', 'name', 'display_name', 'price_monthly', 'max_users', 'max_projects', 'features')

class SubscriptionSerializer(serializers.ModelSerializer):
    plan_details = PlanSerializer(source='plan', read_only=True)
    is_expired = serializers.ReadOnlyField()
    days_left = serializers.ReadOnlyField()
    usage = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = (
            'id', 'plan', 'plan_details', 'status', 'current_period_end',
            'is_expired', 'days_left', 'payment_provider', 'provider_reference',
            'usage', 'created_at'
        )

    def get_usage(self, obj):
        current_users = User.objects.count()
        current_projects = Project.objects.count()
        return {
            'users_count': current_users,
            'max_users': obj.plan.max_users,
            'projects_count': current_projects,
            'max_projects': obj.plan.max_projects,
        }
