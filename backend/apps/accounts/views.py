from rest_framework import viewsets, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from django.db import connection
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.utils import timezone
from .models import User
from .serializers import (

    UserSerializer,
    UserCreateSerializer,
    UserProfileUpdateSerializer,
    ChangePasswordSerializer
)
from apps.core.permissions import IsTenantAdmin, IsTenantManager
from apps.core.throttling import AuthRateThrottle



class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD users inside current tenant:
    - Any authenticated user can list active colleagues
    - Only Tenant Admin can create, update role or delete users
    """
    queryset = User.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action in ['create', 'destroy', 'update', 'partial_update']:
            return [IsTenantAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        tenant = getattr(connection, 'tenant', None)
        if tenant is None or tenant.schema_name == 'public':
            return User.objects.none()

        qs = User.objects.filter(
            memberships__tenant=tenant,
            memberships__is_active=True
        ).distinct().order_by('date_joined')

        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(role=role)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(username__icontains=search) | qs.filter(first_name__icontains=search) | qs.filter(last_name__icontains=search) | qs.filter(email__icontains=search)
        return qs

class CurrentUserProfileView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileUpdateSerializer

    def get_object(self):
        return self.request.user

    def get(self, request, *args, **kwargs):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response({'old_password': ['Mot de passe actuel incorrect.']}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'detail': 'Mot de passe mis à jour avec succès.'})
