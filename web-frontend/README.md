# TeamProject — Frontend (Next.js)

Interface web du SaaS TeamProject : Next.js 15, React 19, Tailwind CSS et `@supabase/supabase-js`.

> Pour lancer **toute** l'application (backend, base, Supabase, paiements) via Docker, suis le guide à la racine : [`../README.md`](../README.md). Ce fichier ne couvre que le développement du frontend seul.

## Développement du frontend seul

Le frontend a besoin du backend (API) et de Supabase. Le plus simple est de lancer le reste avec Docker, puis le frontend en local pour le rechargement à chaud :

```bash
# Depuis la racine du projet : tout sauf le frontend
docker compose up -d backend celery-worker postgres redis nginx

# Ici, dans web-frontend/
npm install
npm run dev          # http://localhost:3001
```

Variables lues depuis `.env` à la racine (voir `.env.example`) :

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique Supabase |
| `NEXT_PUBLIC_API_URL` | URL de l'API (en prod) ; en local le navigateur utilise `/api` via Nginx |

Ne mets jamais de secret dans une variable `NEXT_PUBLIC_*` : elle est incluse dans le code envoyé au navigateur.

> En accès direct sur `http://localhost:3001`, le routage par sous-domaine des organisations n'est pas actif. Passe par Nginx (http://localhost, http://`sous-domaine`.localhost) pour un comportement identique à la production.

## Scripts

```bash
npm run dev       # serveur de développement (port 3001)
npm run build     # build de production
npm start         # servir le build
npm run lint      # ESLint
npm test          # tests Jest
npx tsc --noEmit  # vérification TypeScript
```

## Organisation

```
app/
├── (auth)/            connexion, inscription
├── (dashboard)/       espace organisation (projets, tâches, équipe, facturation…)
└── platform/          console super-admin (/platform)
components/            composants partagés (ex. bandeau d'abonnement)
contexts/AuthContext   session Supabase + profil de l'utilisateur
lib/
├── api.ts             client axios (API tenant, token Supabase auto)
├── platform.ts        client dédié de la console plateforme
└── supabase.ts        client Supabase
```

L'authentification passe par Supabase (`signInWithPassword`) ; le jeton est joint à chaque appel API et rafraîchi automatiquement. La console `/platform` gère sa propre session, isolée de celle du tableau de bord.
