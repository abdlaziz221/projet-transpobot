from fastapi import APIRouter, Depends, HTTPException, Request
import os
import httpx
import re
import json
import logging
from sqlalchemy import text, inspect
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

try:
    from ..database import get_db
    from ..deps import get_current_user
    from ..models import Utilisateur
    from ..schemas import ChatReq
except ImportError:
    from database import get_db
    from deps import get_current_user
    from models import Utilisateur
    from schemas import ChatReq

router = APIRouter(prefix="/api", tags=["chat"])

from slowapi import Limiter
from slowapi.util import get_remote_address
limiter = Limiter(key_func=get_remote_address)

def get_db_mastery_context(db: Session) -> str:
    """Récupère dynamiquement un échantillon des données pour 'éduquer' l'IA."""
    tables = ["vehicules", "chauffeurs", "lignes", "trajets", "incidents", "maintenance", "affectations"]
    context = "VALEURS DANS VOTRE BASE (Exemples réels) :\n"
    for table in tables:
        try:
            result = db.execute(text(f"SELECT * FROM `{table}` LIMIT 1"))
            row = result.fetchone()
            if row:
                d = dict(zip(result.keys(), row))
                for k,v in d.items(): 
                    if hasattr(v, 'isoformat'): d[k] = v.isoformat()
                context += f"- Table {table} : {json.dumps(d, ensure_ascii=False)}\n"
        except Exception: continue
    return context

SCHEMA_INFO = """
SCHÉMA SQL DÉTAILLÉ :
1. vehicules : id, immatriculation, type, capacite, statut ('actif', 'maintenance', 'hors_service')
2. chauffeurs : id, nom, prenom, téléphone
3. trajets : id, ligne_id, chauffeur_id (FK -> chauffeurs.id), vehicule_id (FK -> vehicules.id), statut, recette
4. incidents : id, trajet_id (FK -> trajets.id), type, description, gravite
5. affectations : id, chauffeur_id (FK -> chauffeurs.id), vehicule_id (FK -> vehicules.id)

RÈGLES DE JOINTURE CRITIQUES :
- Pour compter les incidents d'un CHAUFFEUR : Tu DOIS passer par la table 'trajets'. 
  Ex: SELECT count(*) FROM incidents i JOIN trajets t ON i.trajet_id = t.id WHERE t.chauffeur_id = ...
- Pour savoir qui conduit : Utilise 'affectations' ou 'trajets'.
"""

FEW_SHOT_EXAMPLES = """
EXEMPLES DE RÉPONSES PARFAITES :
Q: "combien d'incident pour le chauffeur Awa FAYE ?"
A: {
  "sql": "SELECT COUNT(i.id) as total FROM incidents i JOIN trajets t ON i.trajet_id = t.id JOIN chauffeurs c ON t.chauffeur_id = c.id WHERE c.nom = 'FAYE' AND c.prenom = 'Awa'",
  "answer": "Le chauffeur Awa FAYE totalise X incidents sur ses trajets."
}

Q: "Quels véhicules sont en maintenance ?"
A: {
  "sql": "SELECT immatriculation, type FROM vehicules WHERE statut = 'maintenance'",
  "answer": "Les véhicules en maintenance sont..."
}
"""

def generate_system_prompt(db: Session):
    mastery = get_db_mastery_context(db)
    return f"""Tu es l'Analyste Expert de TranspoBot. Tu réponds UNIQUEMENT en JSON.

{SCHEMA_INFO}

{mastery}

{FEW_SHOT_EXAMPLES}

RÈGLES STRICTES :
1. N'invente JAMAIS de colonnes (ex: pas de 'trajet_affectation_id').
2. Utilise des alias (i.id, t.id) pour éviter les noms de colonnes ambigus.
3. Pour les noms de chauffeurs, cherche TOUJOURS dans la table 'chauffeurs'.
4. Réponds UNIQUEMENT avec {{"sql": "...", "answer": "..."}}. Aucun texte avant ou après.
"""

async def invoke_llm(messages: list) -> str:
    llm_url = os.getenv("LLM_BASE_URL", "http://localhost:11434").rstrip("/")
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{llm_url}/api/chat",
            json={
                "model": os.getenv("LLM_MODEL", "mistral"),
                "messages": messages,
                "stream": False,
                "temperature": 0.0,
                "format": "json"
            },
            timeout=50.0
        )
    resp.raise_for_status()
    return resp.json()['message']['content']

@router.post("/chat")
@limiter.limit("10/minute")
async def chat(req: ChatReq, request: Request, db: Session = Depends(get_db), current_user: Utilisateur = Depends(get_current_user)):
    try:
        prompt = generate_system_prompt(db)
        messages = [{"role": "system", "content": prompt}]
        for msg in req.history[-4:]:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": req.question})

        ai_msg = await invoke_llm(messages)
        o = json.loads(ai_msg)
        sql = o.get("sql")
        ans = o.get("answer", "Analyse terminée.")
        
        data = []
        if sql:
            try:
                result = db.execute(text(sql))
                keys = result.keys()
                rows = result.fetchall()
                data = [dict(zip(keys, row)) for row in rows]
                for row in data:
                    for k, v in row.items():
                        if hasattr(v, 'isoformat'): row[k] = v.isoformat()
            except SQLAlchemyError as db_err:
                logging.error(f"SQL Error: {db_err}")
                return {"answer": f"L'analyse a généré une erreur SQL : {str(db_err)[:100]}. Je m'améliore encore !", "sql": sql, "data": []}
                    
        return {"answer": ans, "sql": sql, "data": data}
        
    except Exception as e:
        logging.error(f"Chat Error Global: {e}")
        return {"answer": "Désolé, j'ai rencontré une difficulté pour traiter cette demande complexe.", "sql": None, "data": []}
