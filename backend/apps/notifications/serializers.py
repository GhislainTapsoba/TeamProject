from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ('id', 'channel', 'message', 'read', 'email_confirmed_at', 'created_at')
