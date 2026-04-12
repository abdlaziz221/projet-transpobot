# TranspoBot - Système de Gestion de Transport Urbain

Projet de gestion de flotte et d'analyse de données pour une société de transport au Sénégal. Cette application permet de suivre les véhicules, chauffeurs et trajets, et intègre un assistant de requêtes en langage naturel.

## 🛠️ Stack Technique

*   **Frontend** : Next.js 14+ (App Router), React, TypeScript, Tailwind CSS, Lucide Icons, Chart.js.
*   **Backend** : FastAPI (Python), SQLAlchemy, PyMySQL, Pydantic, HTTPX.
*   **Base de Données** : MySQL (Relational DB) avec schémas normalisés.
*   **IA & Chatbot** : Ollama (Modèle Llama 3 / Mistral local), traitement analytique par génération SQL dynamique.
*   **Conteneurisation** : Docker, Docker Compose.

## 📦 Fonctionnalités Principales

1.  **Dashboard Global** : KPls en direct (Chiffre d'Affaires, Taux de Maintenance, Trajets Actifs). Graphiques interactifs d'analyse des incidents et de la flotte.
2.  **Gestion des Véhicules** : Système CRUD, suivi kilométrique, filtrage complet du statut (Actif, Maintenance, Retiré).
3.  **Suivi des Trajets** : Vue tabulaire sur les trajets avec dates, chauffeurs affectés, tarifs et passagers transportés.
4.  **Gestion des Incidents** : Résolution des problèmes et rapports détaillés sur la sévérité des événements.
5.  **Planification des Maintenances** : Gestion proactive des dates de révision et calcul financier des opérations.
6.  **TranspoBot Chat IA** : Interface conversationnelle utilisant la mémoire tampon et interrogeant la flotte *via* l'exécution directe et sécurisée de requêtes SQL. Affichage modulaire transparent (Toggle SQL).

## 🚀 Démarrage Rapide (Déploiement)

Le moyen le plus simple de démarrer le projet en production est d'utiliser Docker, qui montera automatiquement la base SQL (via `sql/schema.sql` si disponible ou volume externe), le Backend Python et le Frontend Next.js.

### 1️⃣ Via Docker / Docker Compose

Assurez-vous que Docker Desktop / Engine est lancé sur votre machine :
```bash
docker-compose up -d --build
```
L'application sera alors accessible :
- **Frontend** : http://localhost:3000
- **Backend API Docs** : http://localhost:8000/docs
- **MySQL** : Port 3306 

### 2️⃣ Démarrage Manuel (Développement)

Si vous n'utilisez pas Docker, vous pouvez lancer les instances séparément.

**Backend :**
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

**Frontend :**
```bash
cd frontend_nextjs
npm install
npm run dev
```

## 🔒 Variables d'Environnement

Un fichier `.env` est requis à la racine du Backend (déjà pré-fourni) :
```env
DB_USER=root
DB_PASSWORD=admin
DB_HOST=localhost
DB_NAME=transpobot
LLM_BASE_URL=http://localhost:11434
LLM_MODEL=mistral
SECRET_KEY=votre_cle_de_chiffrement
```

Pour le frontend `frontend_nextjs/.env.local` :
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## 🤖 TranspoBot Chat (LLM Local)
L'assistant conversationnel se connecte au moteur Ollama localisé sur le `port 11434`. Assurez-vous d'avoir téléchargé un modèle approprié (ex: `mistral`) :
```bash
ollama run mistral
```
Le Chatbot maintient un filet de sécurité (`Auto-Retry`), détecte le cycle historique par lots et formate automatiquement les données complexes (FCFA) demandées.

