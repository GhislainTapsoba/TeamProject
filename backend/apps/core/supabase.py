"""
Thin client around the Supabase Auth (GoTrue) REST API.

Supabase is the source of truth for credentials: the backend creates accounts
and changes passwords here with the service role key, and the frontend signs
in directly against Supabase.
"""
import requests
from django.conf import settings

TIMEOUT = 10


class SupabaseError(Exception):
    def __init__(self, message, status_code=None, code=None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code


def _auth_url(path):
    if not settings.SUPABASE_URL:
        raise SupabaseError("SUPABASE_URL n'est pas configuré.")
    return f"{settings.SUPABASE_URL}/auth/v1{path}"


def _admin_headers():
    key = settings.SUPABASE_SERVICE_ROLE_KEY
    if not key:
        raise SupabaseError("SUPABASE_SERVICE_ROLE_KEY n'est pas configuré.")
    return {'apikey': key, 'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'}


def _raise_for_response(response):
    if response.ok:
        return
    try:
        body = response.json()
    except ValueError:
        body = {}
    message = body.get('msg') or body.get('message') or body.get('error_description') or response.text
    raise SupabaseError(message, status_code=response.status_code, code=body.get('error_code') or body.get('code'))


def create_auth_user(email, password, metadata=None):
    """Create a confirmed Supabase user and return its id (UUID string)."""
    response = requests.post(
        _auth_url('/admin/users'),
        json={
            'email': email,
            'password': password,
            'email_confirm': True,
            'user_metadata': metadata or {},
        },
        headers=_admin_headers(),
        timeout=TIMEOUT,
    )
    _raise_for_response(response)
    return response.json()['id']


def update_auth_user_password(supabase_id, password):
    response = requests.put(
        _auth_url(f'/admin/users/{supabase_id}'),
        json={'password': password},
        headers=_admin_headers(),
        timeout=TIMEOUT,
    )
    _raise_for_response(response)


def delete_auth_user(supabase_id):
    response = requests.delete(
        _auth_url(f'/admin/users/{supabase_id}'),
        headers=_admin_headers(),
        timeout=TIMEOUT,
    )
    _raise_for_response(response)


def verify_password(email, password):
    """Return True if Supabase accepts these credentials."""
    key = settings.SUPABASE_ANON_KEY or settings.SUPABASE_SERVICE_ROLE_KEY
    response = requests.post(
        _auth_url('/token?grant_type=password'),
        json={'email': email, 'password': password},
        headers={'apikey': key, 'Content-Type': 'application/json'},
        timeout=TIMEOUT,
    )
    if response.status_code in (400, 401):
        return False
    _raise_for_response(response)
    return True
