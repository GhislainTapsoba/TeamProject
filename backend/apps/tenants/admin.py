from django.contrib import admin
from django_tenants.admin import TenantAdminMixin
from .models import Client, Domain

@admin.register(Client)
class ClientAdmin(TenantAdminMixin, admin.ModelAdmin):
    list_display = ('name', 'schema_name', 'plan', 'is_active', 'created_at')
    search_fields = ('name', 'schema_name')
    list_filter = ('plan', 'is_active')

@admin.register(Domain)
class DomainAdmin(admin.ModelAdmin):
    list_display = ('domain', 'tenant', 'is_primary')
    search_fields = ('domain',)
