import jwt
from jwt import PyJWKClient
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

User = get_user_model()

# Cache the JWKs client – it will fetch and cache keys from Supabase
_jwk_client = PyJWKClient(settings.SUPABASE_JWKS_URL, cache_keys=True)


class SupabaseJWTAuthentication(BaseAuthentication):
    """Authenticate requests using Supabase Auth JWTs.

    The JWT is expected in the ``Authorization: Bearer <token>`` header.
    It validates the signature using Supabase's public JWKs, checks the
    audience (``settings.SUPABASE_JWT_AUDIENCE``) and issuer
    (``settings.SUPABASE_JWT_ISSUER``), then maps the ``sub`` claim to a
    local ``User`` instance via the ``supabase_id`` field.
    """

    def authenticate(self, request):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None  # No token → anonymous request

        token = auth_header.split(" ", 1)[1]
        try:
            signing_key = _jwk_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256"],
                audience=getattr(settings, "SUPABASE_JWT_AUDIENCE", None),
                issuer=getattr(settings, "SUPABASE_JWT_ISSUER", None),
            )
        except Exception as exc:
            raise AuthenticationFailed(f"Supabase token invalid: {exc}")

        supabase_uid = payload.get("sub")
        if not supabase_uid:
            raise AuthenticationFailed("Supabase token missing 'sub' claim")

        user, _ = User.objects.get_or_create(
            supabase_id=supabase_uid,
            defaults={"email": payload.get("email", "")},
        )
        return (user, payload)
