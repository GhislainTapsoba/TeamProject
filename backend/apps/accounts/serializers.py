from rest_framework import serializers

from django.db import connection, transaction
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import User, TenantMembership
from apps.core import supabase



class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'role', 'phone', 'avatar_url', 'is_active', 'date_joined')
        read_only_fields = ('id', 'username', 'email', 'is_active', 'date_joined')

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Le role effectif est celui de l'appartenance au tenant courant
        tenant_role = instance.get_tenant_role()
        if tenant_role:
            data['role'] = tenant_role
        return data

class UserCreateSerializer(serializers.ModelSerializer):
    """
    Ajoute un membre au tenant courant. Si un compte existe deja avec cet email
    (membre d'une autre organisation), il est simplement rattache au tenant :
    le mot de passe n'est alors pas requis et n'est pas modifie.
    """
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'password')
        extra_kwargs = {
            'email': {'required': True},
            'username': {'required': False, 'validators': []},
        }

    def validate_email(self, value):
        value = value.lower().strip()
        tenant = getattr(connection, 'tenant', None)
        if tenant is not None and tenant.schema_name != 'public' and TenantMembership.objects.filter(
            user__email__iexact=value, tenant=tenant, is_active=True
        ).exists():
            raise serializers.ValidationError("Cet utilisateur fait déjà partie de l'organisation.")
        return value

    def validate(self, attrs):
        self._existing_user = User.objects.filter(email__iexact=attrs['email']).first()
        password = attrs.get('password')
        if self._existing_user is None:
            if not password:
                raise serializers.ValidationError({'password': ['Un mot de passe est requis pour un nouveau compte.']})
            try:
                validate_password(password)
            except DjangoValidationError as e:
                raise serializers.ValidationError({'password': list(e.messages)})
        return attrs

    def create(self, validated_data):
        tenant = getattr(connection, 'tenant', None)
        role = validated_data.get('role', 'employee')

        if self._existing_user is not None:
            user = self._existing_user
            if tenant is not None and tenant.schema_name != 'public':
                TenantMembership.objects.update_or_create(
                    user=user, tenant=tenant, defaults={'role': role, 'is_active': True}
                )
            return user

        password = validated_data.pop('password')
        validated_data['username'] = validated_data['email']

        try:
            supabase_id = supabase.create_auth_user(
                validated_data['email'],
                password,
                {'first_name': validated_data.get('first_name', ''), 'last_name': validated_data.get('last_name', '')},
            )
        except supabase.SupabaseError as exc:
            raise serializers.ValidationError({'email': [f"Impossible de créer le compte : {exc}"]})

        try:
            with transaction.atomic():
                user = User.objects.create_user(password=password, supabase_id=supabase_id, **validated_data)
                if tenant is not None and tenant.schema_name != 'public':
                    TenantMembership.objects.create(user=user, tenant=tenant, role=role, is_active=True)
        except Exception:
            try:
                supabase.delete_auth_user(supabase_id)
            except supabase.SupabaseError:
                pass
            raise
        return user

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'phone', 'avatar_url')

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)

    def validate_new_password(self, value):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        try:
            validate_password(value, user=user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
