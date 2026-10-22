# TeamProject

Application SaaS de gestion de projets en équipe, multi-organisations. Chaque organisation a son propre sous-domaine (`acme.localhost`, `acme.deep-technologies.com`), ses données isolées, son équipe et son abonnement.

## Fonctionnalités

- **Organisations** : inscription en libre-service, une base de données isolée par organisation (schéma PostgreSQL).
- **Authentification** : Supabase Auth (email + mot de passe), rôles par organisation (`admin`, `manager`, `employee`).
- **Projets et tâches** : tableau kanban, assignation, priorités et échéances.
- **Équipe** : invitation de membres. Un même compte peut appartenir à plusieurs organisations.
- **Notifications** : email d'assignation de tâche via Mailjet, envoyé en tâche de fond (Celery).
- **Facturation** : plans avec quotas d'utilisateurs et de projets, paiement CinetPay.
- **Supervision** : Sentry (backend et frontend).

## Stack

| Partie | Technologies |
|---|---|
| Backend | Django 5.1, Django REST Framework, django-tenants, Celery |
| Frontend | Next.js 15, React 19, Tailwind CSS, `@supabase/supabase-js` |
| Infrastructure | PostgreSQL 15, Redis, Nginx, Docker Compose |
| Services externes | Supabase Auth, Mailjet, CinetPay, Sentry, Cloudflare Turnstile |

```
TeamProject/
├── backend/            API Django
│   ├── apps/
│   │   ├── accounts/       utilisateurs, appartenances aux organisations
│   │   ├── billing/        plans, abonnements, quotas, CinetPay
│   │   ├── core/           authentification Supabase, permissions, tableau de bord
│   │   ├── notifications/  notifications et emails (Celery)
│   │   ├── projects/       projets et tâches
│   │   └── tenants/        organisations, domaines, inscription
│   ├── config/         settings, urls, celery
│   └── tests/
├── web-frontend/       application Next.js
├── nginx/              reverse proxy (routage par sous-domaine)
└── docker-compose.yml
```

## Démarrage rapide (Docker)

### 1. Prérequis

- Docker Desktop
- Un projet [Supabase](https://supabase.com) (le plan gratuit suffit)

### 2. Configuration

```bash
cp .env.example .env
```

Complète `.env` à la racine. Les variables indispensables :

| Variable | Où la trouver |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → clé anon / publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → clé service_role / secret (**secrète**) |
| `SUPABASE_JWT_SECRET` | Seulement pour les anciens projets qui signent les jetons en HS256 |
| `SECRET_KEY` | Clé Django aléatoire |
| `ENCRYPTION_KEY` | Clé Fernet, utilisée pour chiffrer les clés Mailjet des organisations |
| `POSTGRES_*`, `REDIS_URL` | Valeurs par défaut de `backend/.env.example` |

`backend/.env.example` liste toutes les variables du backend (CinetPay, Sentry, Turnstile…).

> Ne mets jamais de secret dans une variable `NEXT_PUBLIC_*` : elles sont incluses dans le code envoyé au navigateur. Le backend refuse de démarrer s'il en détecte une.

Pour générer les clés :

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"                               # SECRET_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"  # ENCRYPTION_KEY
```

### 3. Lancement

```bash
docker compose up --build -d
docker compose logs -f backend   # attendre la fin des migrations
```

| Service | Adresse |
|---|---|
| Application (via Nginx) | http://localhost |
| Une organisation | http://`sous-domaine`.localhost |
| API | http://localhost:8000/api/ |
| Frontend direct | http://localhost:3001 |

Passe toujours par Nginx (port 80) : c'est lui qui transmet le sous-domaine de l'organisation.

### 4. Premier essai

1. Crée une organisation sur http://localhost/register, par exemple avec le sous-domaine `demo`.
2. Connecte-toi sur http://demo.localhost/login avec l'email et le mot de passe choisis.
3. Crée un projet et des tâches, puis invite des membres depuis la page **Équipe**.

## Développement local (sans Docker pour le code)

Lance seulement PostgreSQL et Redis dans Docker :

```bash
docker compose up -d postgres redis
```

### Backend

```bash
cd backend
python -m venv ../.venv
../.venv/Scripts/activate          # Windows (Linux/macOS : source ../.venv/bin/activate)
pip install -r requirements.txt
cp .env.example .env               # puis POSTGRES_HOST=127.0.0.1
python manage.py migrate_schemas --shared
python manage.py seed_plans
python manage.py runserver
```

Dans un autre terminal, pour les emails :

```bash
celery -A config worker -l info
```

### Frontend

```bash
cd web-frontend
npm install
npm run dev                        # http://localhost:3001
```

## Commandes utiles

```bash
# Créer une organisation et son administrateur en ligne de commande
python manage.py create_tenant "Acme" acme --admin-email admin@acme.com --admin-password "MotDePasse-Solide-1"

# Créer les plans d'abonnement par défaut
python manage.py seed_plans

# Créer un compte Supabase pour les utilisateurs créés avant la migration vers Supabase
python manage.py sync_supabase_users --dry-run
python manage.py sync_supabase_users
```

## Tests et qualité

Backend (PostgreSQL doit tourner, couverture minimale de 80 %) :

```bash
cd backend
pytest
black --check .
ruff check .
```

Frontend :

```bash
cd web-frontend
npm run lint
npx tsc --noEmit
npm test
```

La CI GitHub Actions (`.github/workflows/ci-cd.yml`) exécute ces mêmes vérifications à chaque push, puis construit les images Docker.

## Fonctionnement

### Authentification

1. Le frontend connecte l'utilisateur directement auprès de Supabase (`signInWithPassword`).
2. Chaque requête vers l'API envoie le jeton Supabase (`Authorization: Bearer …`). Il est rafraîchi automatiquement s'il expire.
3. Le backend vérifie la signature du jeton (clés publiques JWKS, ou `SUPABASE_JWT_SECRET`) et retrouve l'utilisateur par son `supabase_id`.
4. L'accès est refusé si l'utilisateur n'est pas membre actif de l'organisation du sous-domaine.

Les comptes sont créés par le backend avec la clé service_role : à l'inscription d'une organisation et à l'invitation d'un membre. Les changements de mot de passe passent aussi par Supabase.

### Multi-organisations

- Le schéma `public` contient les organisations, les domaines, les utilisateurs, les appartenances (`TenantMembership`) et la facturation.
- Chaque organisation a son propre schéma pour les projets, les tâches et les notifications.
- Le sous-domaine de la requête détermine le schéma utilisé.

### Quotas

Chaque plan définit `max_users` et `max_projects`. Au-delà, l'API refuse la création (403) et invite à changer de plan dans **Paramètres → Facturation**.

## Dépannage

| Symptôme | Cause probable |
|---|---|
| 401 juste après la connexion | URL Supabase incorrecte, ou `SUPABASE_JWT_SECRET` manquant pour un ancien projet |
| 503 à l'inscription | `SUPABASE_SERVICE_ROLE_KEY` absente ou invalide |
| 403 « pas membre de cette organisation » | Le compte n'appartient pas à l'organisation de ce sous-domaine |
| Page introuvable pour une organisation | Accès via `localhost:3001` au lieu de `sous-domaine.localhost` |

Pour voir les erreurs : `docker compose logs backend` ou `docker compose logs frontend`.
