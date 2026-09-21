import os
import pytest
from django.conf import settings

# Override settings for local testing
os.environ.setdefault('SECRET_KEY', 'test-secret-key-for-pytest-32bytes-min')
os.environ.setdefault('ENCRYPTION_KEY', 'v1rZk5g7qHk_7D4B6T9u8-v2h1j3k4l5m6n7o8p9q0r=')
os.environ.setdefault('POSTGRES_HOST', 'localhost')
os.environ.setdefault('POSTGRES_PORT', '5432')
os.environ.setdefault('POSTGRES_USER', 'postgres')
os.environ.setdefault('POSTGRES_PASSWORD', 'postgres')
os.environ.setdefault('POSTGRES_DB', 'teamproject')

# Update Django settings for tests
settings.DATABASES['default']['HOST'] = os.environ.get('POSTGRES_HOST', 'localhost')
settings.DATABASES['default']['PORT'] = os.environ.get('POSTGRES_PORT', '5432')
