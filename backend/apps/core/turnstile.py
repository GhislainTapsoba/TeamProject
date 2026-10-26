"""Vérification Cloudflare Turnstile (anti-robot) pour les formulaires publics."""

import requests
from django.conf import settings

VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"


def is_enabled():
    return bool(settings.TURNSTILE_SECRET_KEY)


def verify(token, remote_ip=None):
    """Vrai si le jeton Turnstile est valide. Sans clé configurée, la vérification est désactivée."""
    if not is_enabled():
        return True
    if not token:
        return False
    try:
        response = requests.post(
            VERIFY_URL,
            data={"secret": settings.TURNSTILE_SECRET_KEY, "response": token, "remoteip": remote_ip or ""},
            timeout=10,
        )
        return bool(response.json().get("success"))
    except (requests.RequestException, ValueError):
        # Cloudflare injoignable : on refuse plutôt que de laisser passer les robots
        return False
