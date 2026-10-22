from django.core.management.base import BaseCommand

from apps.billing.defaults import DEFAULT_PLANS
from apps.billing.models import Plan


class Command(BaseCommand):
    help = "Create or update the default subscription plans"

    def handle(self, *args, **options):
        for data in DEFAULT_PLANS:
            plan, created = Plan.objects.update_or_create(name=data["name"], defaults=data)
            label = "Créé" if created else "Mis à jour"
            self.stdout.write(self.style.SUCCESS(f"{label} : {plan.display_name} ({int(plan.price_monthly)} XOF/mois)"))
