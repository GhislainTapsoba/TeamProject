import os
import pytest
from django.conf import settings

# Override database settings for local testing
# When running tests locally with Docker PostgreSQL, use localhost
os.environ['POSTGRES_HOST'] = 'localhost'
os.environ['POSTGRES_PORT'] = '5432'
os.environ['POSTGRES_USER'] = 'postgres'
os.environ['POSTGRES_PASSWORD'] = 'postgres'
os.environ['POSTGRES_DB'] = 'teamproject'

# Update Django settings for tests
settings.DATABASES['default']['HOST'] = 'localhost'
settings.DATABASES['default']['PORT'] = '5432'
