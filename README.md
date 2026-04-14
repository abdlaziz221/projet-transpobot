# 🚌 TranspoBot Sénégal 🇸🇳 - Plateforme IA de Gestion de Flotte

TranspoBot Sénégal 🇸🇳 est une plateforme corporative moderne alliant la puissance d'une base de données relationnelle à l'Intelligence Artificielle générative. Elle permet d'analyser en temps réel les performances, les finances, les incidents et l'aspect opérationnel de votre réseau de transport au Sénégal, le tout orchestré par un agent IA conversationnel.
![TranspoBot Banner](https://via.placeholder.com/1000x300.png?text=TRANSPOBOT+SÉNÉGAL+🇸🇳+AI+)

## 🚀 Guide d'Installation (De zéro à la Production)

Ce guide est conçu pour vous permettre de lancer le projet complet juste après avoir cloné ce dépôt.

### ÉTAPE 1 : Cloner le projet

Si ce n'est pas déjà fait, clonez le dépôt sur votre machine locale :
```bash
git clone https://github.com/votre-nom/transpobot.git
cd transpobot
```

### ÉTAPE 2 : Prérequis Système

Assurez-vous d'avoir installé les logiciels suivants sur votre machine :
1. **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** (doit être en cours d'exécution).
2. **[XAMPP](https://www.apachefriends.org/fr/index.html)** (pour héberger la base de données MySQL localement).
3. **[Ollama](https://ollama.com/)** (le moteur qui fera tourner l'IA localement).

### ÉTAPE 3 : Configuration de l'Intelligence Artificielle (Ollama)

Ollama permet de faire tourner le modèle de langage localement.
1. Ouvrez un terminal (Invite de commandes ou PowerShell).
2. Lancez la commande suivante pour télécharger et démarrer le modèle Qwen 2.5 (cela peut prendre quelques minutes selon votre connexion) :
   ```bash
   ollama run qwen2.5:latest
   ```
3. Une fois l'installation terminée et le prompt `>>>` affiché, vous pouvez fermer ce terminal. Le service Ollama tourne en arrière-plan (sur le port `11434`).

### ÉTAPE 4 : Configuration de la Base de Données (XAMPP)

Le projet utilise votre base de données hôte (via XAMPP) pour des raisons de performance et de persistance pure.

1. Lancez le **Panneau de configuration XAMPP**.
2. Démarrez le module **Apache** et le module **MySQL**.
3. Allez sur **phpMyAdmin** dans votre navigateur : [http://localhost/phpmyadmin](http://localhost/phpmyadmin)
4. Cliquez sur **Nouvelle** dans le menu de gauche et créez une base de données nommée exactement : 
   👉 `transpobot`
   *(Note : Vous n'avez pas besoin d'importer de tables, l'application s'en chargera toute seule au premier démarrage).*

### ÉTAPE 5 : Configuration des Variables d'Environnement

Le projet a besoin d'un fichier `.env` pour faire le lien entre tout.

1. À la racine du projet, faites une copie du fichier `.env.example` et renommez-la en **`.env`**.
2. Ouvrez ce fichier **`.env`** et assurez-vous qu'il ressemble à ceci (normalement les paramètres par défaut sont déjà bons pour XAMPP) :

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
SECRET_KEY=cle_securisee_transpobot_2026

# --- CONFIGURATION FRONTEND ---
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### ÉTAPE 6 : Lancement des Conteneurs (Docker)

Maintenant que l'IA et la base de données tournent sur votre machine, on va lancer le Backend (Python) et le Frontend (React/Next.js) dans Docker.

1. Ouvrez un terminal à la racine du projet (là où se trouve le `docker-compose.yml`).
2. Exécutez la commande de démarrage :
   ```bash
   docker-compose up -d --build
   ```
3. Docker va télécharger les dépendances (Python, Node) et monter les serveurs. Cela prendra 2 à 3 minutes la première fois.

---

## 🌐 Accès à l'Application

Une fois Docker lancé, voici vos points d'entrée :

- 📊 **Interface Utilisateur (Dashboard & Chatbot)** : [http://localhost:3000](http://localhost:3000)
- ⚙️ **Documentation API (Swagger UI)** : [http://localhost:8000/docs](http://localhost:8000/docs)

*Note : Lors du premier démarrage de Docker, le serveur a automatiquement créé les tables dans XAMPP et injecté les données de démonstration. Vous pouvez le vérifier en regardant votre phpMyAdmin !*

## 💡 Astuces & Dépannage

- **Le Chatbot répond "Connection refused"** ? Vérifiez que le logiciel Ollama est bien lancé sur votre machine en allant sur [http://localhost:11434](http://localhost:11434). Vous devriez voir "Ollama is running".
- **Erreur MySQL "Access Denied"** ? Vérifiez dans XAMPP que votre utilisateur MySQL est bien `root` et qu'il n'a pas de mot de passe.
- **Relancer proprement l'application** :
  ```bash
  docker-compose down
  docker-compose up -d
  ```

---
*TranspoBot Enterprise - Conçu pour l'optimisation des transports.*
