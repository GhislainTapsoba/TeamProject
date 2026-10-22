import secrets

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.core import supabase


class Command(BaseCommand):
    help = (
        "Create Supabase accounts for local users that are not linked yet "
        "(accounts created before the move to Supabase Auth). Each one gets a "
        "temporary password that is printed once."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="List the users without creating anything")

    def handle(self, *args, **options):
        User = get_user_model()
        users = User.objects.filter(supabase_id__isnull=True).exclude(email="")
        if not users.exists():
            self.stdout.write(self.style.SUCCESS("All users are already linked to Supabase."))
            return

        for user in users:
            if options["dry_run"]:
                self.stdout.write(f"Would link {user.email}")
                continue
            temporary_password = secrets.token_urlsafe(12)
            try:
                user.supabase_id = supabase.create_auth_user(user.email, temporary_password)
            except supabase.SupabaseError as exc:
                self.stdout.write(self.style.ERROR(f"{user.email}: {exc}"))
                continue
            user.set_password(temporary_password)
            user.save(update_fields=["supabase_id", "password"])
            self.stdout.write(self.style.SUCCESS(f"{user.email}: temporary password {temporary_password}"))
