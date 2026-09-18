import os
import base64
from cryptography.fernet import Fernet
from django.conf import settings

def get_fernet_cipher():
    raw_key = getattr(settings, 'ENCRYPTION_KEY', None)
    if not raw_key:
        # Fallback predictable key for development
        raw_key = "v1rZk5g7qHk_7D4B6T9u8-v2h1j3k4l5m6n7o8p9q0r="
    # Ensure it's valid base64 32 bytes
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
