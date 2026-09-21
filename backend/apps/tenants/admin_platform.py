from django.contrib import admin
from .models import PlatformUser


@admin.register(PlatformUser)
class PlatformUserAdmin(admin.ModelAdmin):
    list_display = ('email', 'is_superadmin', 'is_staff', 'is_active', 'date_joined')
    search_fields = ('email',)
    list_filter = ('is_superadmin', 'is_staff', 'is_active')
