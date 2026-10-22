"""
Authentication and authorization for the platform console (super-admins).

Super-admins authenticate with Supabase like everyone else, but the token must
resolve to an active PlatformUser (matched by Supabase id), not a tenant user.
This is verified on every request. An optional IP allowlist adds a second gate.
"""

import ipaddress

import jwt
from django.conf import settings
from django.utils import timezone
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied
from rest_framework.permissions import BasePermission
from rest_framework.throttling import AnonRateThrottle

from apps.core.authentication import decode_supabase_token

from .models import PlatformUser


def client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def ip_is_allowed(ip):
    allowlist = [entry.strip() for entry in settings.PLATFORM_IP_ALLOWLIST if entry.strip()]
    if not allowlist:
        return True
    if not ip:
        return False
    try:
        address = ipaddress.ip_address(ip)
    except ValueError:
        return False
    for entry in allowlist:
        try:
            if "/" in entry:
                if address in ipaddress.ip_network(entry, strict=False):
                    return True
            elif address == ipaddress.ip_address(entry):
                return True
        except ValueError:
            continue
    return False


class PlatformJWTAuthentication(BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith(f"{self.keyword} "):
            return None

        token = auth_header.split(" ", 1)[1].strip()
        try:
            payload = decode_supabase_token(token)
        except AuthenticationFailed:
            raise
        except jwt.ExpiredSignatureError as exc:
            raise AuthenticationFailed("Session expirée.") from exc
        except Exception as exc:
            raise AuthenticationFailed("Jeton d'authentification invalide.") from exc

        supabase_uid = payload.get("sub")
        if not supabase_uid:
            raise AuthenticationFailed("Jeton sans identifiant utilisateur.")

        admin = PlatformUser.objects.filter(supabase_id=supabase_uid, is_active=True).first()
        if admin is None:
            # Never reveal whether the account merely lacks platform rights
            raise PermissionDenied("Accès réservé à l'administration de la plateforme.")

        if not ip_is_allowed(client_ip(request)):
            raise PermissionDenied("Accès refusé depuis cette adresse IP.")

        PlatformUser.objects.filter(pk=admin.pk).update(last_login_at=timezone.now())
        return (admin, payload)

    def authenticate_header(self, request):
        return self.keyword


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        return isinstance(request.user, PlatformUser) and request.user.is_active


class PlatformRateThrottle(AnonRateThrottle):
    scope = "platform"
