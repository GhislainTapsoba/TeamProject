#!/usr/bin/env python
"""
Create a Django superuser in the **public** schema.

The script runs inside the Django environment, forces the connection
to the public schema (via `schema_context('public')`), and creates the
admin user with the credentials supplied through environment variables.

Usage (run inside the container):
    docker exec teamproject-backend 
        python backend/scripts/create_public_superuser.py
"""

import os
import sys

import django
from django.conf import settings

# Initialise Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django_tenants.utils import schema_context
from apps.accounts.models import User

# Expected environment variables (set by the docker `exec` command)
USERNAME = os.getenv('DJANGO_SUPERUSER_USERNAME', 'admin')
EMAIL    = os.getenv('DJANGO_SUPERUSER_EMAIL', 'admin@example.com')
PASSWORD = os.getenv('DJANGO_SUPERUSER_PASSWORD', 'admin123')

def main():
    try:
        with schema_context('public'):            # <-- force public schema
            if User.objects.filter(username=USERNAME).exists():
                print(f"[INFO] Superuser '{USERNAME}' already exists in public schema.")
                return

            User.objects.create_superuser(
                username=USERNAME,
                email=EMAIL,
                password=PASSWORD,
                role='admin'                       # matches the ROLE_CHOICES
            )
            print(f"[SUCCESS] Superuser '{USERNAME}' created in public schema.")
    except Exception as e:
        print("[ERROR] Failed to create superuser:", e)
        sys.exit(1)

if __name__ == '__main__':
    main()
