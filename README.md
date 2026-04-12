# TranspoBot — Projet GLSi L3 ESP/UCAD

## Démarrage rapide

1. Créer la base de données : (A ignorer //Moctar)
   mysql -u root -p < schema.sql

2. Configurer l'environnement :
   cp .env.example .env
   # Éditer .env avec vos valeurs
   ## Connexion dans la base de donnee
   Installation de MySQL 8.0.45 https://dev.mysql.com/downloads/installer/
   Connexion via MySQL Workbench
      connecté sur Local instance MySQL80
      Créé la base de données : CREATE DATABASE transpobot;
      Import du schema.sql via file --> Open SQL Script
      Selectionner le database transpobot avant d'executer le script  avec l'éclair ⚡
   Renseigner les informations manquantes dans le fichier .env (password)
   

3. Installer les dépendances :
   pip install -r requirements.txt

4. Lancer le backend :
   python app.py

5. Ouvrir index.html dans un navigateur
   (mettre l'URL du backend dans la variable API de index.html)

## Livrables à rendre
- Lien plateforme déployée (Railway/Render)
- Lien interface de chat
- Rapport PDF (MCD, MLD, architecture, tests)
- Présentation PowerPoint (démo)

## Technologies
- Backend : FastAPI (Python)
- Base de données : MySQL
- LLM : OpenAI GPT / Ollama (local)
- Frontend : HTML/CSS/JS vanilla
