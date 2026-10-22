from .models import Plan

DEFAULT_PLANS = [
    {
        "name": "free",
        "display_name": "Gratuit",
        "price_monthly": 0,
        "max_users": 5,
        "max_projects": 3,
        "features": [
            "Vue Kanban interactive",
            "Notifications in-app",
        ],
    },
    {
        "name": "pro",
        "display_name": "Professionnel",
        "price_monthly": 15000,
        "max_users": 25,
        "max_projects": 30,
        "features": [
            "Emails transactionnels Mailjet",
            "Support prioritaire",
            "Vue Kanban et filtres avancés",
        ],
    },
    {
        "name": "enterprise",
        "display_name": "Entreprise",
        "price_monthly": 45000,
        "max_users": 100,
        "max_projects": 200,
        "features": [
            "Journal d'activité et sécurité avancée",
            "Accompagnement dédié",
        ],
    },
]


def ensure_default_plans():
    """Create the default plans if they are missing; existing plans are left untouched."""
    for data in DEFAULT_PLANS:
        Plan.objects.get_or_create(name=data["name"], defaults=data)
