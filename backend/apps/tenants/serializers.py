import re
from rest_framework import serializers
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import Client, Domain

class ClientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Client
        fields = ('id', 'name', 'schema_name', 'plan', 'is_active', 'mail_from_email', 'created_at')
        read_only_fields = ('id', 'schema_name', 'created_at')

class TenantRegistrationSerializer(serializers.Serializer):
    organization_name = serializers.CharField(max_length=100)
    subdomain = serializers.CharField(max_length=50)
    admin_email = serializers.EmailField()
    admin_name = serializers.CharField(max_length=150)
    admin_password = serializers.CharField(write_only=True, min_length=8)

    def validate_admin_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate_subdomain(self, value):
        subdomain = value.lower().strip()
        if not re.match(r'^[a-z0-9-]+$', subdomain):
            raise serializers.ValidationError("Le sous-domaine ne doit contenir que des lettres minuscules, chiffres et tirets.")
        if subdomain in ['public', 'www', 'admin', 'api', 'app', 'mail', 'system', 'root']:
            raise serializers.ValidationError("Ce nom de sous-domaine est réservé.")
        if Client.objects.filter(schema_name=subdomain).exists():
            raise serializers.ValidationError("Cette organisation ou sous-domaine existe déjà.")
        return subdomain
