from rest_framework import serializers

from django.db import connection
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.conf import settings
from .models import User



class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'full_name', 'role', 'phone', 'avatar_url', 'is_active', 'date_joined')
        read_only_fields = ('id', 'date_joined')

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'role', 'phone', 'password')

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'Un mot de passe est requis.'})
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

    def validate_new_password(self, value):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        try:
            validate_password(value, user=user)
        except DjangoValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value
