# 🚀 TeamProject – Docker Start & Connection Guide

## Overview

TeamProject is a **SaaS multi‑tenant** platform built with Django‑tenants (backend) and a lightweight Next.js admin dashboard (frontend). This guide shows how to spin up the whole stack with Docker on Windows and how to log in as the **platform‑wide admin** and as a **tenant admin**.

---
## Prerequisites

- **Docker Desktop** (Windows 10/11) – <https://www.docker.com/products/docker-desktop>
- **Git** (to clone the repo) or a zip of the project.
- **PowerShell** (or CMD) with administrator rights if you need to edit the `hosts` file.

---
## 1️⃣ Environment variables

Two `.env` files are read by `docker‑compose.yml`:

1. **Root `.env`** – global settings for Docker services.
   ```text
   POSTGRES_DB=teamproject
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   DEBUG=True
   SECRET_KEY=dev-secret-key-please‑change
   ```
2. **`backend/.env`** – Django‑specific configuration.
   ```text
   ENCRYPTION_KEY=v1rZk5g7qHk_7D4B6T9u8‑v2h1j3k4l5m6n7o8p9q0r=
   CINETPAY_API_KEY=
   CINETPAY_SITE_ID=
   PLATFORM_DOMAIN=deep‑technologies.com   # or your local domain
   ```

Copy the example files if they exist (`example.env` → `.env`) and adjust the values as needed.

---
## 2️⃣ Build & start the stack

```powershell
# From the repository root
docker compose up -d --build
```
Docker will:
- Build the **backend**, **celery‑worker**, **celery‑beat**, **frontend**, and **nginx** images.
- Run PostgreSQL and Redis containers.
- Wait for the DB, then run migrations (`migrate_schemas --shared` and `migrate_schemas`).
- Start Gunicorn on port **8000**.
- Expose the Next.js app on port **3001** (via Nginx on port **80**/`443`).

### Verify containers are healthy
```powershell
docker compose ps          # should show all services “Up”
# Follow the backend logs to ensure migrations finished:
docker compose logs -f backend
```
The last log line of the backend should be “Démarrage de Gunicorn…”.

---
## 3️⃣ Create a **Platform Admin** (super‑admin for the SaaS platform)

```powershell
docker compose exec backend \
  python manage.py shell -c "
from apps.tenants.models import PlatformUser;
PlatformUser.objects.create(
    email='admin@teamproject.com',
    is_superadmin=True,
    is_staff=True,
    is_active=True
)"
```
You can list the created admin to confirm:
```powershell
docker compose exec backend python manage.py shell -c "from apps.tenants.models import PlatformUser; print(list(PlatformUser.objects.values()))"
```

---
## 4️⃣ Create a **Tenant** for testing (and its admin user)

```powershell
docker compose exec backend \
  python manage.py create_tenant MyCompany mycompany \
    --admin-email admin@mycompany.com \
    --admin-password Secret123! \
    --admin-username admin
```
Expected output:
```
Created tenant 'MyCompany' with schema 'mycompany'.
Created domain 'mycompany.teamproject.deep-technologies.com'.
Created admin user 'admin' for tenant 'mycompany'.
Tenant setup complete.
```

---
## 5️⃣ Log in to the admin interfaces

### 5.1 Platform Admin (public schema)
- **URL:** `http://localhost:8000/admin/`
- **Credentials:**
  - Email: `admin@teamproject.com`
  - Password: the one you set when creating the user (you can change it with `manage.py changepassword`).
- You will see the **public‑schema** admin UI, a list of **Clients** (tenants) and the **Platform users** section.

### 5.2 Tenant Admin (tenant‑specific schema)
#### Option A – Edit the Windows `hosts` file (recommended for local dev)
```text
# C:\Windows\System32\drivers\etc\hosts
127.0.0.1   mycompany.teamproject.deep-technologies.com
```
Then open:
- **URL:** `http://mycompany.teamproject.deep-technologies.com/admin/`
- **Credentials:**
  - Username: `admin`
  - Password: `Secret123!`

#### Option B – Use `curl` with a custom `Host` header (no hosts‑file change)
```powershell
curl -c cookies.txt -b cookies.txt \
  -H "Host: mycompany.teamproject.deep-technologies.com" \
  http://localhost:8000/admin/login/
# Follow the normal login flow by POSTing `username` and `password`.
```
Both methods give you access to the **tenant‑specific** admin UI – you will only see data belonging to the `mycompany` schema.

---
## 6️⃣ (Optional) Front‑end dashboard
The Next‑js dashboard runs behind Nginx on **http://localhost** (port 80). After the stack is up you can visit:
```
http://localhost/dashboard
```
It uses the same JWT authentication as the API – obtain a token via the `/api/token/` endpoint (using the platform admin or tenant admin credentials) and paste it into the dashboard login screen.

---
## 7️⃣ Cleanup

```powershell
# Stop and remove containers + volumes (including the DB data)
docker compose down -v
```
Run the steps again from **2️⃣** to start fresh.

---
## TL;DR cheat‑sheet
```powershell
# Build & start
docker compose up -d --build

# Platform admin creation
docker compose exec backend python manage.py shell -c "from apps.tenants.models import PlatformUser; PlatformUser.objects.create(email='admin@teamproject.com', is_superadmin=True, is_staff=True, is_active=True)"

# Tenant creation
docker compose exec backend python manage.py create_tenant MyCompany mycompany --admin-email admin@mycompany.com --admin-password Secret123! --admin-username admin

# Access URLs
#   Platform admin : http://localhost:8000/admin/
#   Tenant admin   : http://mycompany.teamproject.deep-technologies.com/admin/  (add host entry if needed)
```

---
*Generated by Antigravity – your AI pair‑programmer.*
