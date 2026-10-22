"""
Provision a platform super-admin.

Creates (or links) a Supabase account and the matching PlatformUser in the
public schema. Platform admins are never created through the app; this command
is the only way in, so it is the right place to require a strong password.

    python manage.py create_platform_admin --email you@example.com
    python manage.py create_platform_admin --email you@example.com --password '...'
"""

import getpass

from django.core.management.base import BaseCommand, CommandError
from django_tenants.utils import schema_context

from apps.core import supabase

from ...models import PlatformUser


class Command(BaseCommand):
    help = "Create or link a platform super-admin account"

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--password", help="If omitted, prompted for (unless the account already exists)")
        parser.add_argument(
            "--supabase-id",
            help="Link to an existing Supabase user instead of creating one",
        )

    def handle(self, *args, **options):
        email = options["email"].strip().lower()

        with schema_context("public"):
            existing = PlatformUser.objects.filter(email=email).first()

            supabase_id = options.get("supabase_id")
            if not supabase_id:
                password = options.get("password")
                if not password:
                    password = getpass.getpass("Mot de passe du super-admin (min. 12 caractères) : ")
                if len(password) < 12:
                    raise CommandError("Le mot de passe doit faire au moins 12 caractères.")
                try:
                    supabase_id = supabase.create_auth_user(email, password, {"platform_admin": True})
                except supabase.SupabaseError as exc:
                    if exc.status_code == 422:
                        raise CommandError(
                            "Un compte Supabase existe déjà pour cet email. Relancez avec --supabase-id <uuid>."
                        ) from exc
                    raise CommandError(f"Échec Supabase : {exc}") from exc

            if existing:
                existing.supabase_id = supabase_id
                existing.is_active = True
                existing.save(update_fields=["supabase_id", "is_active"])
                self.stdout.write(self.style.SUCCESS(f"Super-admin mis à jour : {email}"))
            else:
                PlatformUser.objects.create(email=email, supabase_id=supabase_id)
                self.stdout.write(self.style.SUCCESS(f"Super-admin créé : {email}"))

        self.stdout.write("Connectez-vous sur la console plateforme du domaine principal : /platform")
