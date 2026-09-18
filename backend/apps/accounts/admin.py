from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'is_active', 'is_staff')
    list_filter = ('role', 'is_active', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (
        ('Informations Tenant & RBAC', {'fields': ('role', 'phone', 'avatar_url')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Informations Tenant & RBAC', {'fields': ('role', 'phone', 'avatar_url')}),
    )
