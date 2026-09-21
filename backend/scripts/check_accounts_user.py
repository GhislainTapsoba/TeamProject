import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("SELECT schemaname, tablename FROM pg_tables WHERE tablename='accounts_user'")
    rows = cursor.fetchall()
    print('Found tables:', rows)
