from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.db import connection
from .models import User

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['email'] = user.email
        token['name'] = user.full_name
        tenant = getattr(connection, 'tenant', None)
        if tenant:
            token['tenant_schema'] = tenant.schema_name
            token['tenant_name'] = tenant.name
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        tenant = getattr(connection, 'tenant', None)

        data['user'] = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': user.full_name,
            'role': user.role,
            'phone': user.phone,
            'avatar_url': user.avatar_url,
        }

        if tenant:
            data['tenant'] = {
                'name': tenant.name,
                'schema_name': tenant.schema_name,
                'plan': getattr(tenant, 'plan', 'free'),
            }

        return data

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'role', 'phone', 'avatar_url', 'is_active', 'date_joined')
        read_only_fields = ('id', 'date_joined')

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'password')

    def create(self, validated_data):
        password = validated_data.pop('password', None) or 'Password123!'
        if not validated_data.get('username'):
            validated_data['username'] = validated_data['email']
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user

class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'phone', 'avatar_url')

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
