# 🌐 Guide de Déploiement TranspoBot (Prêt pour la Soutenance)

Ce document explique comment mettre en ligne votre application TranspoBot pour répondre aux exigences du livrable "Lien plateforme déployée".

## Option A : Déploiement sur un VPS (Méthode Recommandée)
Un VPS (Virtual Private Server) vous donne un contrôle total. Vous pouvez en louer un chez DigitalOcean, AWS (Free Tier), ou OVH.

### 1. Préparation du serveur
Une fois connecté en SSH à votre serveur :
```bash
# Installer Docker et Docker-Compose
sudo apt update && sudo apt install docker.io docker-compose -y
```

### 2. Déploiement du code
Clonez votre dépôt GitHub sur le serveur :
```bash
git clone https://github.com/votre-compte/transpobot.git
cd transpobot

# Créez le fichier .env à partir de l'exemple et configurez-le
cp .env.example .env
nano .env # Remplacez 127.0.0.1 par l'IP de votre serveur
```

### 3. Lancement
```bash
docker-compose up -d --build
```
L'application sera accessible sur `http://IP_DU_SERVEUR:3000`.

---

## Option B : Déploiement sur Railway (Simplifié)
Railway est une plateforme Cloud qui gère le déploiement automatiquement depuis GitHub.

### 1. Déploiement de la Base de Données
*   Créez un nouveau projet sur Railway.
*   Ajoutez un service **MySQL**.
*   Copiez les variables de connexion (Host, Port, User, Password).

### 2. Déploiement du Backend (FastAPI)
*   Connectez votre Repo GitHub.
*   Dans les variables d'environnement de Railway, copiez toutes les variables de votre fichier `.env`.
*   Railway détectera automatiquement le `Dockerfile` et lancera le backend.

### 3. Déploiement du Frontend (Next.js)
*   De même, connectez le dossier `frontend_nextjs`.
*   Configurez `NEXT_PUBLIC_API_URL` avec l'URL publique fournie par Railway pour votre service Backend.

---

## 🔒 Notes Importantes sur l'IA en Ligne
L'IA (Ollama/Mistral) demande beaucoup de puissance (GPU). 

1.  **Solution Gratuite** : Vous pouvez utiliser l'API **Groq** ou **Together AI** qui sont compatibles avec le format OpenAI. Il suffira de changer `LLM_BASE_URL` dans votre `.env` pour pointer vers leur API (ex: `https://api.groq.com/openai/v1`).
2.  **Solution VPS** : Si votre serveur a moins de 8Go de RAM, Ollama sera très lent ou crashera.

## 🏁 Vérification Finale
Une fois déployé, votre application doit être accessible via une URL (ex: `http://154.67.XX.XX:3000`). Testez le login `admin/admin123` et le Chat pour valider que tout fonctionne bien en réseau distant.
