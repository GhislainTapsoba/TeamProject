import os
from unittest.mock import patch

from django.conf import settings
from django.test import TestCase

from apps.accounts.serializers import ChangePasswordSerializer, UserCreateSerializer
from apps.core.security import decrypt_value, encrypt_value, ensure_no_public_secret_prefixes
from apps.tenants.serializers import TenantRegistrationSerializer


class SecurityPolicyTestCase(TestCase):
    def test_settings_security_configuration(self):
        """Verify core security settings are properly configured."""
        self.assertEqual(settings.SECURE_PROXY_SSL_HEADER, ("HTTP_X_FORWARDED_PROTO", "https"))
        self.assertTrue(settings.SECURE_CONTENT_TYPE_NOSNIFF)
        self.assertEqual(settings.X_FRAME_OPTIONS, "DENY")

        self.assertIn("auth", settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}))
        self.assertIn("registration", settings.REST_FRAMEWORK.get("DEFAULT_THROTTLE_RATES", {}))

    def test_production_refuses_to_start_without_secrets(self):
        """En production (DEBUG=False), le serveur refuse de démarrer sans SECRET_KEY."""
        import subprocess
        import sys

        # Valeurs explicites : le .env local (DEBUG=True) ne les écrase pas
        env = {**os.environ, "DEBUG": "False", "SECRET_KEY": "", "ENCRYPTION_KEY": ""}
        env["DJANGO_SETTINGS_MODULE"] = "config.settings"
        result = subprocess.run(
            [sys.executable, "-c", "import django; django.setup()"],
            cwd=settings.BASE_DIR,
            env=env,
            capture_output=True,
            text=True,
        )

        self.assertNotEqual(result.returncode, 0)
        self.assertIn("SECRET_KEY environment variable is required in production", result.stderr)

    def test_user_create_rejects_weak_password(self):
        """Verify that UserCreateSerializer rejects weak passwords."""
        serializer = UserCreateSerializer(
            data={"username": "test@example.com", "email": "test@example.com", "password": "123"}
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("password", serializer.errors)

    def test_tenant_registration_rejects_weak_password(self):
        """Verify that TenantRegistrationSerializer rejects weak passwords."""
        serializer = TenantRegistrationSerializer(
            data={
                "organization_name": "Acme",
                "subdomain": "acmetest",
                "admin_email": "admin@acme.com",
                "admin_name": "Admin User",
                "admin_password": "123",
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("admin_password", serializer.errors)

    def test_change_password_rejects_weak_password(self):
        """Verify that ChangePasswordSerializer rejects weak new passwords."""
        serializer = ChangePasswordSerializer(data={"old_password": "ValidOldPassword123!", "new_password": "123"})
        self.assertFalse(serializer.is_valid())
        self.assertIn("new_password", serializer.errors)

    def test_fernet_encryption_and_decryption(self):
        """Verify Fernet encryption and decryption integrity."""
        raw_secret = "secret_mailjet_api_key_xyz_789"
        encrypted = encrypt_value(raw_secret)
        self.assertNotEqual(raw_secret, encrypted)
        decrypted = decrypt_value(encrypted)
        self.assertEqual(raw_secret, decrypted)

    def test_public_secret_prefixes_are_rejected(self):
        """Sensitive keys must never be stored in NEXT_PUBLIC_* or VITE_* env vars."""
        with (
            patch.dict(os.environ, {"NEXT_PUBLIC_STRIPE_SECRET_KEY": "sk_live_123"}, clear=False),
            self.assertRaises(ValueError),
        ):
            ensure_no_public_secret_prefixes()
