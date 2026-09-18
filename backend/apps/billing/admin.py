from django.contrib import admin
from .models import Plan, Subscription

@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_name', 'price_monthly', 'max_users', 'max_projects')

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ('tenant', 'plan', 'status', 'current_period_end', 'payment_provider', 'provider_reference')
    list_filter = ('status', 'plan', 'payment_provider')
    search_fields = ('tenant__name', 'tenant__schema_name', 'provider_reference')
