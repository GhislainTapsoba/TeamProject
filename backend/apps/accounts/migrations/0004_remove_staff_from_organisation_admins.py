from django.db import migrations


def remove_staff_flag(apps, schema_editor):
    # Les admins d'organisation n'ont pas à entrer dans l'administration Django :
    # la table des comptes est partagée entre toutes les organisations
    User = apps.get_model("accounts", "User")
    User.objects.filter(is_staff=True, is_superuser=False).update(is_staff=False)


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0003_user_supabase_id_tenantmembership"),
    ]

    operations = [
        migrations.RunPython(remove_staff_flag, migrations.RunPython.noop),
    ]
