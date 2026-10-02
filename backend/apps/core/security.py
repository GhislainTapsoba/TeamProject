import os
import base64
from cryptography.fernet import Fernet
from django.conf import settings

PUBLIC_ENV_PREFIXES = ('NEXT_PUBLIC_', 'VITE_')
PUBLIC_SECRET_INDICATORS = (
    'secret',
    'token',
    'private',
    'api_key',
    'service_role',
    'access_key',
    'sk_live',
    'rk_live',
)


def ensure_no_public_secret_prefixes():
    """Fail fast if a secret is accidentally exposed to frontend clients."""
    for key, value in os.environ.items():
        normalized_key = key.upper()
        if not normalized_key.startswith(PUBLIC_ENV_PREFIXES):
            continue
        if not value:
            continue
        lower_value = value.lower()
        lower_key = normalized_key.lower()
        if any(indicator in lower_key for indicator in PUBLIC_SECRET_INDICATORS) or any(
            indicator in lower_value for indicator in PUBLIC_SECRET_INDICATORS
        ):
            raise ValueError(
                f"Sensitive secret detected in '{key}'. Keep all secret keys server-side. "
                "Do not prefix them with NEXT_PUBLIC_ or VITE_."
            )


def get_fernet_cipher():
    raw_key = getattr(settings, 'ENCRYPTION_KEY', None)
    if not raw_key:
        raise ValueError('ENCRYPTION_KEY is not configured')
    if isinstance(raw_key, str):
        key_bytes = raw_key.encode('utf-8')
    else:
        key_bytes = raw_key
    return Fernet(key_bytes)

def encrypt_value(value: str) -> str:
    """Encrypt a plaintext string using Fernet symetric encryption."""
    if not value:
        return ""
    cipher = get_fernet_cipher()
    encrypted_bytes = cipher.encrypt(value.encode('utf-8'))
    return encrypted_bytes.decode('utf-8')

def decrypt_value(encrypted_val: str) -> str:
    """Decrypt an encrypted string back to plaintext."""
    if not encrypted_val:
        return ""
    try:
        cipher = get_fernet_cipher()
        decrypted_bytes = cipher.decrypt(encrypted_val.encode('utf-8'))
        return decrypted_bytes.decode('utf-8')
    except Exception as e:
        # If not encrypted or invalid key, return as is or empty
        return encrypted_val
