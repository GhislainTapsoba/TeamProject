"""
Script de creation de donnees de test (utilisateurs + projet + taches).
Usage : docker compose exec backend python manage.py shell < scripts/create_test_data.py

Roles reels du modele User : admin, manager, employee
(source: User._meta.get_field('role').choices)
"""

from datetime import date, timedelta

from django_tenants.utils import schema_context

from apps.accounts.models import User

TEST_PASSWORD = "TestPass123!"
TENANT_SCHEMA = "demo"  # adapte si tu testes sur un autre tenant (ex: "acme")

# ---------------------------------------------------------------------------
# 1) Utilisateurs (accounts.User est en SHARED_APPS -> pas besoin de schema_context)
# ---------------------------------------------------------------------------
users_data = [
    {
        "username": "admin1",
        "email": "admin1@test.local",
        "first_name": "Fatou",
        "last_name": "Sow",
        "role": "admin",
        "is_staff": True,     # acces admin Django
        "is_superuser": False,
    },
    {
        "username": "manager1",
        "email": "manager1@test.local",
        "first_name": "Marie",
        "last_name": "Dupont",
        "role": "manager",
        "is_staff": True,     # acces admin Django
        "is_superuser": False,
    },
    {
        "username": "employee1",
        "email": "employee1@test.local",
        "first_name": "Jean",
        "last_name": "Martin",
        "role": "employee",
        "is_staff": False,    # pas d'acces admin Django, teste via API/frontend
        "is_superuser": False,
    },
    {
        "username": "employee2",
        "email": "employee2@test.local",
        "first_name": "Awa",
        "last_name": "Traore",
        "role": "employee",
        "is_staff": False,
        "is_superuser": False,
    },
]

created_users = {}
print("=== Utilisateurs ===")
for data in users_data:
    username = data["username"]
    user, created = User.objects.get_or_create(username=username, defaults=data)
    if created:
        user.set_password(TEST_PASSWORD)
        user.save()
        print(f"[CREE] {user.username} | role={user.role} | staff={user.is_staff}")
    else:
        print(f"[EXISTE DEJA] {user.username}")
    created_users[username] = user

# ---------------------------------------------------------------------------
# 2) Donnees metier (Project/ProjectMember/Task sont en TENANT_APPS
#    -> obligatoire de passer par schema_context)
# ---------------------------------------------------------------------------
print(f"\n=== Donnees metier (tenant: {TENANT_SCHEMA}) ===")
with schema_context(TENANT_SCHEMA):
    from apps.projects.models import Project, ProjectMember, Task

    project, created = Project.objects.get_or_create(
        name="Refonte Site Web",
        defaults={
            "manager": created_users["manager1"],
            "status": "in_progress",
            "start_date": date.today(),
            "end_date": date.today() + timedelta(days=60),
            "due_date": date.today() + timedelta(days=60),
        },
    )
    print(f"[PROJET] {project.name} ({'cree' if created else 'existe deja'})")

    for username in ["admin1", "manager1", "employee1", "employee2"]:
        _, member_created = ProjectMember.objects.get_or_create(
            project=project, user=created_users[username]
        )
        if member_created:
            print(f"  [MEMBRE AJOUTE] {username}")

    # Une tache par etat/priorite, pour tester le Kanban (todo / in_progress / done)
    tasks_data = [
        {
            "title": "Maquettes UI",
            "description": "Design des ecrans principaux sur Figma",
            "state": "done",
            "priority": "high",
            "assignee": created_users["employee1"],
            "due_date": date.today() - timedelta(days=5),
        },
        {
            "title": "Integration API",
            "description": "Connexion du frontend Next.js a l'API Django",
            "state": "in_progress",
            "priority": "high",
            "assignee": created_users["employee2"],
            "due_date": date.today() + timedelta(days=10),
        },
        {
            "title": "Tests unitaires",
            "description": "Couverture des endpoints critiques",
            "state": "todo",
            "priority": "medium",
            "assignee": created_users["employee1"],
            "due_date": date.today() + timedelta(days=20),
        },
        {
            "title": "Deploiement staging",
            "description": "Mise en ligne sur l'environnement de recette",
            "state": "todo",
            "priority": "low",
            "assignee": created_users["manager1"],
            "due_date": date.today() + timedelta(days=30),
        },
    ]

    for t in tasks_data:
        task, task_created = Task.objects.get_or_create(
            project=project, title=t["title"], defaults=t
        )
        if task_created:
            print(f"  [TACHE CREEE] {task.title} -> {task.state} ({task.priority})")
        else:
            print(f"  [TACHE EXISTE] {task.title}")

print(f"\nMot de passe commun a tous les comptes crees : {TEST_PASSWORD}")
print("Comptes admin Django (is_staff=True) : admin1, manager1")
print("Comptes API/frontend uniquement       : employee1, employee2")