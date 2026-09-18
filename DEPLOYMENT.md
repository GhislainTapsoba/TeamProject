# Guide de Déploiement et d'Exploitation — Team Project SaaS Multi-Tenant

Ce document détaille l'architecture, la configuration et le déploiement de la nouvelle version SaaS Multi-Tenant de **Team Project** (`teamproject.deep-technologies.com`).

---

## 1. Vue d'Ensemble de l'Architecture

- **Multi-Tenancy** : Isolation par schéma PostgreSQL (`django-tenants`), routage dynamique par sous-domaine (`{tenant}.teamproject.deep-technologies.com`).
- **Backend** : Django 5 + Django REST Framework + SimpleJWT.
- **Frontend** : Next.js 15 (Client pur), inspiré de l'UI/UX de **Plane** (`app.plane.so`), avec résolution du tenant par sous-domaine via `middleware.ts`.
- **Tâches de fond** : Celery + Redis (Emails transactionnels Mailjet, rappels périodiques).
- **Paiement SaaS** : CinetPay (Orange Money, Moov Money, Cartes Bancaires - devises XOF) avec vérification serveur systématique.
- **Reverse Proxy** : Nginx avec support Wildcard `*.deep-technologies.com`.

---

## 2. Démarrage Rapide en Local

### 1. Variables d'environnement
Créez le fichier `.env` dans `backend/` :
```bash
cp backend/.env.example backend/.env
```

### 2. Démarrage des conteneurs
```bash
docker compose up --build -d
```

### 3. Initialisation des schémas et des plans
```bash
# Appliquer les migrations sur le schéma public et les schémas tenants
docker compose exec backend python manage.py migrate_schemas

# Initialiser les plans SaaS par défaut (Gratuit, Pro, Entreprise)
docker compose exec backend python manage.py seed_plans
```

### 4. Créer votre première organisation (Tenant)
```bash
docker compose exec backend python manage.py create_tenant \
    --name "Deep Technologies" \
    --schema "deep" \
    --admin-email "admin@deep-technologies.com" \
    --admin-password "VotreMotDePasseFort123!" \
    --admin-name "Admin Deep" \
    --plan "pro"
```

Le tenant sera accessible en local sur :
- Frontend : `http://deep.localhost:3001` (ou via Nginx sur le port 80 : `http://deep.localhost`)
- API : `http://deep.localhost/api/`
- Identifiants : `admin@deep-technologies.com` / `VotreMotDePasseFort123!`

---

## 3. Déploiement en Production sur le VPS

### Étape 1 : Configuration DNS Wildcard
Chez votre registrar de domaine (Cloudflare, OVH, etc.), ajoutez les enregistrements DNS suivants pointant vers l'adresse IP publique de votre VPS :
- Type A : `teamproject.deep-technologies.com` -> `IP_VPS`
- Type A : `*.teamproject.deep-technologies.com` -> `IP_VPS`

### Étape 2 : Certificat SSL Wildcard (Certbot DNS Challenge)
Générez le certificat wildcard couvrant le domaine principal et tous les sous-domaines clients :
```bash
certbot certonly --manual --preferred-challenges dns \
    -d "teamproject.deep-technologies.com" \
    -d "*.teamproject.deep-technologies.com"
```
Placez les certificats générés dans le dossier monté par Nginx (`/etc/letsencrypt/live/...`).

### Étape 3 : Lancement de la Stack
```bash
cd /opt/teamproject
docker compose -f docker-compose.yml up -d --build
```

### Étape 4 : Création des Schémas et Seed
```bash
docker compose exec backend python manage.py migrate_schemas
docker compose exec backend python manage.py seed_plans
```

---

## 4. Gestion des Abonnements & CinetPay

1. **Compte Marchand** : Les identifiants `CINETPAY_API_KEY` et `CINETPAY_SITE_ID` sont définis dans le `.env` au niveau serveur (les fonds arrivent directement sur le compte de votre plateforme SaaS).
2. **Webhook Idempotent** :
   - URL de notification : `https://teamproject.deep-technologies.com/api/billing/cinetpay/webhook/`
   - Le backend re-vérifie chaque notification auprès de `https://api-checkout.cinetpay.com/v2/payment/check`.
   - Seules les transactions vérifiées `ACCEPTED` activent ou prolongent l'abonnement.
3. **Période de grâce / Expiration** :
   - Le middleware `SubscriptionCheckMiddleware` restreint l'accès en lecture seule lorsque l'abonnement est expiré, sans jamais supprimer les données du client.

---

## 5. Sécurité et Bonnes Pratiques

- **Chiffrement au repos** : Les clés API Mailjet fournies par chaque tenant sont systématiquement chiffrées au repos via `Fernet` (clé symétrique AES 256).
- **Isolation stricte** : Chaque requête HTTP résolue par sous-domaine bascule le `search_path` PostgreSQL vers le schéma du client. Il est mathématiquement impossible pour un client d'accéder aux données d'un autre tenant.
- **Audit Logs** : Toutes les opérations de modification (création de projet, suppression, changements de rôle) sont consignées dans la table `ActivityLog`.
