import time
from unittest.mock import patch, MagicMock

import jwt
from django.test import SimpleTestCase, override_settings
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.test import APIRequestFactory

from apps.core.authentication import SupabaseJWTAuthentication, decode_supabase_token

SECRET = 'test-supabase-jwt-secret-with-enough-length'
SUPABASE_SETTINGS = dict(
    SUPABASE_JWT_SECRET=SECRET,
    SUPABASE_JWT_AUDIENCE='authenticated',
    SUPABASE_JWT_ISSUER='https://example.supabase.co/auth/v1',
)


def make_token(**overrides):
    payload = {
        'sub': '6f1c1d3e-0000-4000-8000-000000000001',
        'email': 'alice@example.com',
        'aud': 'authenticated',
        'iss': 'https://example.supabase.co/auth/v1',
        'exp': int(time.time()) + 3600,
    }
    payload.update(overrides)
    return jwt.encode(payload, SECRET, algorithm='HS256')


@override_settings(**SUPABASE_SETTINGS)
class SupabaseJWTAuthenticationTestCase(SimpleTestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.auth = SupabaseJWTAuthentication()

    def _request(self, token):
        return self.factory.get('/api/auth/me/', HTTP_AUTHORIZATION=f'Bearer {token}')

    def test_decodes_valid_hs256_token(self):
        payload = decode_supabase_token(make_token())
        self.assertEqual(payload['email'], 'alice@example.com')

    def test_request_without_token_is_anonymous(self):
        self.assertIsNone(self.auth.authenticate(self.factory.get('/api/auth/me/')))

    def test_expired_token_is_rejected(self):
        with self.assertRaises(AuthenticationFailed):
            self.auth.authenticate(self._request(make_token(exp=int(time.time()) - 10)))

    def test_wrong_audience_is_rejected(self):
        with self.assertRaises(AuthenticationFailed):
            self.auth.authenticate(self._request(make_token(aud='anon')))

    def test_forged_signature_is_rejected(self):
        forged = jwt.encode({'sub': 'x', 'aud': 'authenticated'}, 'another-secret-of-sufficient-length', algorithm='HS256')
        with self.assertRaises(AuthenticationFailed):
            self.auth.authenticate(self._request(forged))

    def test_unknown_supabase_user_is_rejected(self):
        with patch('apps.core.authentication.User.objects.filter') as mock_filter:
            mock_filter.return_value.first.return_value = None
            with self.assertRaises(AuthenticationFailed):
                self.auth.authenticate(self._request(make_token()))

    def test_known_user_without_tenant_is_authenticated(self):
        user = MagicMock(is_active=True, is_superuser=False)
        with patch('apps.core.authentication.User.objects.filter') as mock_filter, \
                patch('apps.core.authentication.connection') as mock_connection:
            mock_filter.return_value.first.return_value = user
            mock_connection.tenant = None
            authenticated_user, payload = self.auth.authenticate(self._request(make_token()))
        self.assertIs(authenticated_user, user)
        self.assertEqual(payload['sub'], '6f1c1d3e-0000-4000-8000-000000000001')

    def test_unauthenticated_response_uses_bearer_header(self):
        self.assertEqual(self.auth.authenticate_header(None), 'Bearer')
