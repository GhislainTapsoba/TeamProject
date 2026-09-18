from django.contrib import admin
from .models import Notification

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('user', 'channel', 'message', 'read', 'created_at')
    list_filter = ('channel', 'read', 'created_at')
    search_fields = ('user__email', 'message')
