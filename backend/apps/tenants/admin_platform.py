from django.contrib import admin

from .models import PlatformAuditLog, PlatformUser


@admin.register(PlatformUser)
class PlatformUserAdmin(admin.ModelAdmin):
    list_display = ("email", "supabase_id", "is_superadmin", "is_active", "last_login_at", "date_joined")
    search_fields = ("email",)
    list_filter = ("is_superadmin", "is_staff", "is_active")


@admin.register(PlatformAuditLog)
class PlatformAuditLogAdmin(admin.ModelAdmin):
    list_display = ("created_at", "actor_email", "action", "target", "ip_address")
    search_fields = ("actor_email", "action", "target")
    list_filter = ("action",)
    readonly_fields = ("actor_email", "action", "target", "detail", "ip_address", "created_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
