# 🚌 TranspoBot Enterprise - Plateforme IA de Gestion de Flotte

TranspoBot Enterprise est une plateforme corporative moderne alliant la puissance d'une base de données relationnelle à l'Intelligence Artificielle générative. Elle permet d'analyser en temps réel les performances, les finances, les incidents et l'aspect opérationnel de votre réseau de transport au Sénégal, le tout orchestré par un agent IA conversationnel.

![TranspoBot Banner](https://via.placeholder.com/1000x300.png?text=TRANSPOBOT+ENTERPRISE+AI+)

## 🚀 Fonctionnalités Principales

- **Chatbot Analytique (Two-Pass Architecture)** : 
  - *Pass 1* : Génération dynamique de requêtes SQL complexes et optimisées depuis le langage naturel (Intention, Few-Shot Prompting).
  - *Pass 2* : Synthétisation des résultats bruts en langage naturel strict, sans hallucinations, boosté par le GPU (VRAM Offloading).
- **Auto-Guérison SQL (Self-Healing)** : L'algorithme détecte les erreurs MariaDB, interroge l'IA sur l'erreur rencontrée, corrige la requête et réessaie automatiquement de manière totalement transparente pour l'utilisateur.
- **Cache IA Performant** : Mise en cache par hachage MD5 des requêtes répétitives pour une exécution en moins de 100 millisecondes.
- **Détection des Intentions** : Analyse "Zero-Cost" des messages conversationnels (bonjour, merci, help) pour éviter les appels inutiles à la base de données.
- **Dashboard Analytique en Temps Réel** : Indicateurs de flotte, suivi du taux d'occupation, et graphiques de recettes connectés sur FastAPI.

## 🛠️ Stack Technologique

**Frontend :**
- **Next.js 14** (React) - Architecture App Router.
- **Tailwind CSS** - Apparence "Premium", effets de flou (Glassmorphism), UI hyper fluide.
- **Lucide React** - Iconographie professionnelle.
- *Conteneurisé avec Docker.*

**Backend :**
- **FastAPI** (Python) - Haute performance, typage strict.
- **SQLAlchemy & PyMySQL** - ORM et connexion base de données robuste.
- **Ollama API** - Intégration transparente pour des LLMs locaux (`qwen2.5:latest`).
- *Conteneurisé avec Docker.*

**Infrastructure / Base de données :**
- **SGBD** : MySQL / MariaDB via **XAMPP local** (Hôte : `host.docker.internal`).
- **Orchestration** : `docker-compose` liant FastAPI et Next.js de manière unifiée à XAMPP.

## ⚙️ Prérequis

1. **Docker Desktop** actif.
2. **XAMPP** installé avec le module **MySQL / MariaDB démarré**.
3. **Ollama** installé en local avec le modèle récupéré :
   ```bash
   ollama run qwen2.5:latest
   ```

## 🏗️ Installation & Lancement

### 1. Configuration de la Base de Données (XAMPP)
- Ouvrez le panneau XAMPP, démarrez **MySQL**.
- Ouvrez `phpMyAdmin` (http://localhost/phpmyadmin).
- Créez une nouvelle base de données nommée **`transpobot`**.
- L'application créera automatiquement ses propres tables au démarrage, mais si besoin, vous pouvez injecter manuellement le fichier complet contenu dans `sql/schema1.sql`.

### 2. Configuration de l'Environnement
Dans le dossier `transpobot`, assurez-vous d'avoir le fichier `.env` configuré comme tel :

```env
# --- CONFIGURATION BASE DE DONNÉES (DB XAMPP) ---
DB_NAME=transpobot
DB_USER=root
DB_PASSWORD=
DB_HOST=host.docker.internal

# --- CONFIGURATION IA (OLLAMA) ---
LLM_BASE_URL=http://host.docker.internal:11434
LLM_MODEL=qwen2.5:latest

# --- CONFIGURATION DE SÉCURITÉ ---
SECRET_KEY=votre_cle_hyper_securisee_ici

# --- CONFIGURATION FRONTEND ---
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Exécution

Ouvrez un terminal à la racine (où se trouve `docker-compose.yml`) et lancez :

```bash
docker-compose down
docker-compose up -d --build
```

### 4. Accès
- **Tableau de Bord & App Client** : [http://localhost:3000](http://localhost:3000)
- **Documentation API Backend** : [http://localhost:8000/docs](http://localhost:8000/docs)

*Identifiants par défaut du portail (inclus par the Seeder) :*
- Username : `admin_dakar` (ou autre défini par le seeder/Base)
- Password : `passer` ou lié aux rôles de développement.

## 📁 Structure du Projet

```text
transpobot/
├── backend/                  # API Python FastAPI
│   ├── routers/              # Logiques métier (ex: chat.py avec Passe 1 & Passe 2)
│   ├── database.py           # Configuration SQLAlchemy XAMPP
│   └── models.py             # Représentation SQL des 10 tables structurées
├── frontend_nextjs/          # Application Web Réactive
│   ├── app/                  # Routeur UI
│   └── components/           # Composants graphiques (ChatIA.tsx, UI Premium)
├── sql/                      # Dumps et scripts base de données (schema1.sql)
├── docker-compose.yml        # Orchestrateur d'infrastruture Docker
└── .env                      # Variables environnements
```

## 🔐 Sécurité

Le backend protège l'application de toute modification des données via le chat : l'IA est cloitrée par blocage programmatique (`Rejet de tout ce qui n'est pas "SELECT"`), et limite du rate-limit (15 requêtes / minute par IP).

---
*Projet architectural conçu à des fins académiques/corporatives pour l'administration des transports publics.*
