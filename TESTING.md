# Guide de Tests - TeamProject

Ce guide explique comment lancer les tests pour le backend Django et le frontend Next.js.

## 🧪 Tests Backend (Django)

### Prérequis

1. **Installer les dépendances de test :**
```bash
cd backend
pip install -r requirements.txt
```

2. **Configurer la base de données de test :**
   - Les tests utilisent PostgreSQL en mémoire ou une base de test séparée
   - Configuration automatique via `pytest-django`

### Lancer les tests

#### Tous les tests
```bash
cd backend
pytest
```

#### Tests avec verbosité détaillée
```bash
pytest -v
```

#### Tests spécifiques
```bash
# Tests multi-tenant uniquement
pytest tests/test_multitenancy.py

# Test spécifique
pytest tests/test_multitenancy.py::MultiTenantIsolationTestCase::test_complete_data_isolation_between_tenants
```

#### Tests avec coverage
```bash
pytest --cov=apps --cov-report=html --cov-report=term
```

Le rapport HTML sera généré dans `backend/htmlcov/index.html`

#### Tests en mode watch (re-lance automatiquement)
```bash
pip install pytest-xdist
pytest -f
```

### Tests Actuels

- **`test_multitenancy.py`** - Tests d'isolation multi-tenant
  - `test_complete_data_isolation_between_tenants` - Vérifie l'isolation complète entre tenants
  - `test_encrypted_mailjet_keys_per_tenant` - Vérifie le chiffrement des credentials Mailjet

### Configuration Pytest

Le fichier `pytest.ini` configure :
- Settings Django : `config.settings`
- Chemin des tests : `tests/`
- Coverage minimum : 80%
- Rapports : terminal + HTML

## 🧪 Tests Frontend (Next.js)

### Prérequis

1. **Installer les dépendances de test :**
```bash
cd web-frontend
npm install
```

### Lancer les tests

#### Tous les tests
```bash
cd web-frontend
npm test
```

#### Tests en mode watch
```bash
npm run test:watch
```

#### Tests avec coverage
```bash
npm run test:coverage
```

#### Tests spécifiques
```bash
npm test -- example.test
```

### Tests Actuels

- **`__tests__/example.test.tsx`** - Test exemple (à remplacer par de vrais tests)

### Configuration Jest

Le fichier `jest.config.js` configure :
- Environnement JSDOM pour les tests React
- Mapping des alias `@/`
- Coverage minimum : 70%
- Rapports détaillés

## 🐳 Tests avec Docker

### Lancer tous les tests dans Docker

```bash
# Lancer les conteneurs de test
docker compose -f docker-compose.yml up -d postgres redis

# Lancer les tests backend
docker compose exec backend pytest

# Lancer les tests frontend
docker compose exec web-frontend npm test
```

### Tests d'intégration complets

```bash
# Build et lance tous les services
docker compose up -d

# Attendre que les services soient prêts
sleep 10

# Lancer les tests backend
docker compose exec backend pytest --cov=apps --cov-report=term

# Lancer les tests frontend
docker compose exec web-frontend npm test -- --coverage
```

## 📊 Rapports de Coverage

### Backend
- **Terminal** : Affiché directement après les tests
- **HTML** : `backend/htmlcov/index.html`
- **XML** : `backend/coverage.xml` (pour CI/CD)

### Frontend
- **Terminal** : Affiché directement après les tests
- **HTML** : `web-frontend/coverage/index.html`
- **JSON** : `web-frontend/coverage/coverage-final.json`

## 🔧 Dépannage

### Erreur "No module named 'pytest'"
```bash
cd backend
pip install pytest pytest-django pytest-cov
```

### Erreur de connexion PostgreSQL
```bash
# Vérifier que PostgreSQL tourne
docker compose ps postgres

# Redémarrer PostgreSQL
docker compose restart postgres
```

### Migrations Django-Tenants

Django-tenants nécessite une procédure de migration spécifique :

#### 1. Configuration locale (.env)
```bash
cd backend
echo "POSTGRES_HOST=localhost" > .env
echo "POSTGRES_PORT=5432" >> .env
echo "POSTGRES_USER=postgres" >> .env
echo "POSTGRES_PASSWORD=postgres" >> .env
echo "POSTGRES_DB=teamproject" >> .env
```

#### 2. Lancer PostgreSQL avec Docker
```bash
docker compose up -d postgres redis
```

#### 3. Nettoyer la base de données (si nécessaire)
```bash
docker compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS teamproject;"
docker compose exec postgres psql -U postgres -c "CREATE DATABASE teamproject;"
```

#### 4. Créer les migrations
```bash
cd backend
python manage.py makemigrations
```

#### 5. Appliquer les migrations schéma public (SHARED_APPS)
```bash
python manage.py migrate_schemas --shared
```

#### 6. Appliquer les migrations tenants (TENANT_APPS)
```bash
python manage.py migrate_schemas
```

#### 7. Lancer les tests
```bash
python -m pytest
```

Note : Les tests multi-tenant nécessitent que le schéma public soit migré avant de créer des tenants.

### Erreur "Module not found" dans frontend
```bash
cd web-frontend
rm -rf node_modules package-lock.json
npm install
```

### Tests trop lents
```bash
# Utiliser pytest-xdist pour le parallélisme
pip install pytest-xdist
pytest -n auto  # Utilise tous les CPU disponibles
```

## 🎯 Prochaines étapes

### Tests Backend à créer

1. **Tests d'authentification**
   - Login JWT
   - Refresh token
   - Registration
   - Permission RBAC

2. **Tests de facturation**
   - Création d'abonnement
   - Webhook CinetPay
   - Vérification de transaction

3. **Tests de notifications**
   - Envoi d'email
   - Création de notification in-app
   - Celery tasks

4. **Tests d'API**
   - CRUD Projects
   - CRUD Tasks
   - Multi-tenant routing

### Tests Frontend à créer

1. **Tests de composants**
   - Login form
   - Dashboard
   - Project list
   - Kanban board

2. **Tests d'intégration**
   - API client
   - Auth context
   - Tenant middleware

3. **Tests E2E**
   - Flux utilisateur complet
   - Création de projet
   - Gestion des tâches

## 📝 CI/CD Integration

Les tests sont automatiquement lancés dans le pipeline GitHub Actions :
- Backend : pytest avec coverage
- Frontend : npm test avec coverage
- Security : Trivy scan

Voir `.github/workflows/ci-cd.yml` pour la configuration complète.
