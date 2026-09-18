from rest_framework import serializers
from .models import ActivityLog
from apps.accounts.serializers import UserSerializer

class ActivityLogSerializer(serializers.ModelSerializer):
    user_details = UserSerializer(source='user', read_only=True)

    class Meta:
        model = ActivityLog
        fields = ('id', 'user', 'user_details', 'action', 'resource_type', 'resource_id', 'details', 'ip_address', 'created_at')
