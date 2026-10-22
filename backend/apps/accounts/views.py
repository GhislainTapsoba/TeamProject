from rest_framework import viewsets, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from django.db import connection
from .models import User, TenantMembership
from .serializers import (
    UserSerializer,
    UserCreateSerializer,
    UserProfileUpdateSerializer,
    ChangePasswordSerializer
)
from apps.core import supabase
from apps.core.permissions import IsTenantAdmin
from apps.core.throttling import AuthRateThrottle


def _current_tenant():
    tenant = getattr(connection, 'tenant', None)
    if tenant is None or tenant.schema_name == 'public':
        return None
    return tenant


class UserViewSet(viewsets.ModelViewSet):
    """
    CRUD users inside current tenant:
    - Any authenticated user can list active colleagues
    - Only Tenant Admin can create, update role or remove users
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
        tenant = _current_tenant()
        if tenant is None:
            return User.objects.none()

        qs = User.objects.filter(
            memberships__tenant=tenant,
            memberships__is_active=True
        ).distinct().order_by('date_joined')

        role = self.request.query_params.get('role')
        if role:
            qs = qs.filter(memberships__tenant=tenant, memberships__role=role)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(username__icontains=search) | qs.filter(first_name__icontains=search) | qs.filter(last_name__icontains=search) | qs.filter(email__icontains=search)
        return qs

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)

    def perform_update(self, serializer):
        user = serializer.save()
        role = serializer.validated_data.get('role')
        tenant = _current_tenant()
        if role and tenant is not None:
            TenantMembership.objects.filter(user=user, tenant=tenant).update(role=role)

    def destroy(self, request, *args, **kwargs):
        user = self.get_object()
        if user.pk == request.user.pk:
            return Response({'detail': 'Vous ne pouvez pas vous retirer vous-même.'}, status=status.HTTP_400_BAD_REQUEST)
        # Le compte peut appartenir a d'autres organisations : on retire seulement l'appartenance
        TenantMembership.objects.filter(user=user, tenant=_current_tenant()).update(is_active=False)
        return Response(status=status.HTTP_204_NO_CONTENT)

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
        try:
            if not supabase.verify_password(user.email, serializer.validated_data['old_password']):
                return Response({'old_password': ['Mot de passe actuel incorrect.']}, status=status.HTTP_400_BAD_REQUEST)
            supabase.update_auth_user_password(user.supabase_id, serializer.validated_data['new_password'])
        except supabase.SupabaseError:
            return Response({'detail': "Le service d'authentification est indisponible."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        # Garde le mot de passe local synchronise (utilise par l'admin Django)
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response({'detail': 'Mot de passe mis à jour avec succès.'})
