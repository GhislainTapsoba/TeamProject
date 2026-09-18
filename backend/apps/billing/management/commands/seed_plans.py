from django.core.management.base import BaseCommand
from apps.billing.models import Plan

class Command(BaseCommand):
    help = 'Seed initial SaaS subscription plans'

    def handle(self, *args, **options):
        plans_data = [
            {
                'name': 'free',
                'display_name': 'Gratuit',
                'price_monthly': 0,
                'max_users': 5,
                'max_projects': 3,
                'features': [
                    "Jusqu'à 5 collaborateurs",
                    "3 projets actifs simultanés",
                    "Vue Kanban interactive",
                    "Notifications in-app"
                ]
            },
            {
                'name': 'pro',
                'display_name': 'Professionnel',
                'price_monthly': 15000,
                'max_users': 25,
                'max_projects': 30,
                'features': [
                    "Jusqu'à 25 collaborateurs",
                    "30 projets actifs",
                    "Emails transactionnels Mailjet",
                    "Support prioritaire",
                    "Vue Kanban et filtres avancés"
                ]
            },
            {
                'name': 'enterprise',
                'display_name': 'Entreprise',
                'price_monthly': 45000,
                'max_users': 100,
                'max_projects': 200,
                'features': [
                    "Collaborateurs illimités",
                    "Projets illimités",
                    "Audit de sécurité et logs d'activité",
                    "Passerelle de paiement dédiée",
                    "Accompagnement VIP"
                ]
            }
        ]

        for p in plans_data:
            plan, created = Plan.objects.update_or_create(
                name=p['name'],
                defaults=p
            )
            status_str = "Créé" if created else "Mis à jour"
            self.stdout.write(self.style.SUCCESS(f"{status_str}: {plan.display_name} ({int(plan.price_monthly)} XOF/mois)"))

        self.stdout.write(self.style.SUCCESS("Tous les plans SaaS ont été initialisés avec succès."))
