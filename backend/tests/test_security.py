from django.test import TestCase, override_settings
from rest_framework.exceptions import ValidationError
from apps.accounts.serializers import UserCreateSerializer, ChangePasswordSerializer
from apps.tenants.serializers import TenantRegistrationSerializer
from apps.core.security import encrypt_value, decrypt_value
from django.conf import settings

class SecurityPolicyTestCase(TestCase):
    def test_settings_security_configuration(self):
        """Verify core security settings are properly configured."""
        self.assertEqual(settings.SECURE_PROXY_SSL_HEADER, ('HTTP_X_FORWARDED_PROTO', 'https'))
        self.assertTrue(settings.SECURE_CONTENT_TYPE_NOSNIFF)
        self.assertEqual(settings.X_FRAME_OPTIONS, 'DENY')
        self.assertTrue(settings.SIMPLE_JWT.get('BLACKLIST_AFTER_ROTATION'))
        self.assertIn('rest_framework_simplejwt.token_blacklist', settings.TENANT_APPS)
        self.assertIn('auth', settings.REST_FRAMEWORK.get('DEFAULT_THROTTLE_RATES', {}))
        self.assertIn('registration', settings.REST_FRAMEWORK.get('DEFAULT_THROTTLE_RATES', {}))

    def test_user_create_rejects_weak_password(self):
        """Verify that UserCreateSerializer rejects weak passwords."""
        serializer = UserCreateSerializer(data={
            'username': 'test@example.com',
            'email': 'test@example.com',
            'password': '123'
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('password', serializer.errors)

    def test_tenant_registration_rejects_weak_password(self):
        """Verify that TenantRegistrationSerializer rejects weak passwords."""
        serializer = TenantRegistrationSerializer(data={
            'organization_name': 'Acme',
            'subdomain': 'acmetest',
            'admin_email': 'admin@acme.com',
            'admin_name': 'Admin User',
            'admin_password': '123'
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('admin_password', serializer.errors)

    def test_change_password_rejects_weak_password(self):
        """Verify that ChangePasswordSerializer rejects weak new passwords."""
        serializer = ChangePasswordSerializer(data={
            'old_password': 'ValidOldPassword123!',
            'new_password': '123'
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('new_password', serializer.errors)

    def test_fernet_encryption_and_decryption(self):
        """Verify Fernet encryption and decryption integrity."""
        raw_secret = "secret_mailjet_api_key_xyz_789"
        encrypted = encrypt_value(raw_secret)
        self.assertNotEqual(raw_secret, encrypted)
        decrypted = decrypt_value(encrypted)
        self.assertEqual(raw_secret, decrypted)
