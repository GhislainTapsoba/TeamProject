# Windows Setup Guide - TeamProject

Guide spécifique pour la configuration et l'exécution des tests sur Windows.

## 🔧 Backend (Django/Pytest)

### Problème PATH Python

Si `pytest` n'est pas reconnu, vous avez deux solutions :

#### Solution 1 : Utiliser python -m pytest (recommandé)

```bash
cd backend
python -m pytest
```

#### Solution 2 : Ajouter Python Scripts au PATH

1. **Trouver le chemin des Scripts Python :**
   ```powershell
   python -c "import sys; print(sys.executable)"
   ```
   Cela affiche quelque chose comme : `C:\Users\DEEP DEV\AppData\Roaming\Python\Python314\python.exe`

2. **Ajouter le dossier Scripts au PATH :**
   - Le dossier Scripts est généralement : `C:\Users\DEEP DEV\AppData\Roaming\Python\Python314\Scripts`
   - Ajoutez ce chemin à vos variables d'environnement Windows

3. **Redémarrer le terminal** et réessayer :
   ```bash
   pytest
   ```

### Lancer les tests Backend

```bash
cd backend
python -m pytest
```

Avec coverage :
```bash
python -m pytest --cov=apps --cov-report=html --cov-report=term
```

Test spécifique :
```bash
python -m pytest tests/test_multitenancy.py
```

## 🌐 Frontend (Next.js/Jest)

### Problème React 19 vs Testing Library

React 19 nécessite @testing-library/react@16.0.0+. C'est déjà corrigé dans package.json.

### Réinstaller les dépendances

```bash
cd web-frontend
# Supprimer node_modules et package-lock.json
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# Réinstaller
npm install
```

### Lancer les tests Frontend

```bash
cd web-frontend
npm test
```

Avec coverage :
```bash
npm run test:coverage
```

Mode watch :
```bash
npm run test:watch
```

## 🐳 Docker (Recommandé pour éviter les problèmes Windows)

La méthode la plus simple est d'utiliser Docker qui évite tous les problèmes de PATH et de dépendances :

```bash
# Lancer les conteneurs
docker compose up -d postgres redis

# Tests backend
docker compose exec backend python -m pytest

# Tests frontend
docker compose exec web-frontend npm test
```

## 📋 Résumé des commandes Windows

### Backend
```bash
cd backend
python -m pip install -r requirements.txt
python -m pytest
python -m pytest --cov=apps --cov-report=html
```

### Frontend
```bash
cd web-frontend
npm install
npm test
npm run test:coverage
```

### Docker (alternative)
```bash
docker compose up -d postgres redis
docker compose exec backend python -m pytest
docker compose exec web-frontend npm test
```

## 🔧 Dépannage Windows

### Erreur "python n'est pas reconnu"
```powershell
# Vérifier si Python est installé
python --version

# Si non, installer depuis https://python.org
# Cocher "Add Python to PATH" lors de l'installation
```

### Erreur "npm n'est pas reconnu"
```powershell
# Vérifier si Node.js est installé
node --version
npm --version

# Si non, installer depuis https://nodejs.org
```

### Erreur de permissions
```powershell
# Exécuter PowerShell en tant qu'administrateur
# Ou utiliser les commandes avec -ExecutionPolicy Bypass
powershell -ExecutionPolicy Bypass -File script.ps1
```

### Problèmes de réseau/proxy
```powershell
# Configurer npm proxy si nécessaire
npm config set proxy http://proxy.company.com:8080
npm config set https-proxy http://proxy.company.com:8080

# Configurer pip proxy si nécessaire
pip install --proxy http://proxy.company.com:8080 package_name
```

## 🎯 Configuration Recommandée Windows

### Variables d'environnement

Ajoutez ces chemins à votre PATH Windows :
```
C:\Users\VOTRE_USER\AppData\Roaming\Python\Python314\Scripts
C:\Users\VOTRE_USER\AppData\Roaming\npm
```

### VS Code Configuration

Créez `.vscode/settings.json` :
```json
{
  "python.defaultInterpreterPath": "python",
  "python.terminal.activateEnvironment": true,
  "terminal.integrated.defaultProfile.windows": "PowerShell"
}
```

## 📝 Notes Spécifiques Windows

- Utilisez `python -m pytest` au lieu de `pytest` pour éviter les problèmes PATH
- Utilisez PowerShell ou Git Bash pour les commandes
- Évitez les chemins avec espaces si possible
- Les antivirus peuvent parfois bloquer l'installation de packages
