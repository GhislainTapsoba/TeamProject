import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import connection
from jwt import PyJWKClient
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed, PermissionDenied

User = get_user_model()

_jwk_client = None


def _get_jwk_client():
    # Built lazily so that importing settings without Supabase configured does not fail
    global _jwk_client
    if _jwk_client is None:
        if not settings.SUPABASE_JWKS_URL:
            raise AuthenticationFailed("Supabase n'est pas configuré sur le serveur.")
        _jwk_client = PyJWKClient(settings.SUPABASE_JWKS_URL, cache_keys=True)
    return _jwk_client


def decode_supabase_token(token):
    options = {
        "audience": settings.SUPABASE_JWT_AUDIENCE or None,
        "issuer": settings.SUPABASE_JWT_ISSUER or None,
    }
    if settings.SUPABASE_JWT_SECRET and jwt.get_unverified_header(token).get("alg") == "HS256":
        return jwt.decode(token, settings.SUPABASE_JWT_SECRET, algorithms=["HS256"], **options)
    signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
    return jwt.decode(token, signing_key.key, algorithms=["RS256", "ES256"], **options)


class SupabaseJWTAuthentication(BaseAuthentication):
    """Authenticate requests using Supabase Auth JWTs.

    The JWT is expected in the ``Authorization: Bearer <token>`` header. The
    ``sub`` claim is mapped to a local ``User`` via ``supabase_id`` (set when
    the backend creates the Supabase account). On a tenant schema the user
    must also hold an active membership.
    """

    keyword = "Bearer"

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith(f"{self.keyword} "):
            return None  # No token → anonymous request

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

        user = self._resolve_user(supabase_uid)
        if not user.is_active:
            raise AuthenticationFailed("Ce compte est désactivé.")

        tenant = getattr(connection, "tenant", None)
        if tenant is not None and tenant.schema_name != "public" and not user.is_superuser:
            if not user.memberships.filter(tenant=tenant, is_active=True).exists():
                raise PermissionDenied("Vous n'êtes pas membre de cette organisation.")

        return (user, payload)

    def authenticate_header(self, request):
        # Makes DRF answer 401 (not 403) so the frontend can refresh its session
        return self.keyword

    @staticmethod
    def _resolve_user(supabase_uid):
        user = User.objects.filter(supabase_id=supabase_uid).first()
        if user is None:
            raise AuthenticationFailed("Aucun compte TeamProject n'est associé à cet utilisateur.")
        return user
