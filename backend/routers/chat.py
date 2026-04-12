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

def get_table_samples(db: Session) -> str:
    """Récupère un aperçu des données pour guider la génération SQL."""
    tables = ["vehicules", "chauffeurs", "lignes", "trajets", "incidents", "maintenance", "affectations"]
    context = "VUE RAPIDE DES DONNÉES :\n"
    for table in tables:
        try:
            result = db.execute(text(f"SELECT * FROM `{table}` LIMIT 1"))
            row = result.fetchone()
            if row:
                d = dict(zip(result.keys(), row))
                for k,v in d.items(): 
                    if hasattr(v, 'isoformat'): d[k] = v.isoformat()
                context += f"- {table} : {json.dumps(d, ensure_ascii=False)}\n"
        except Exception: continue
    return context

SCHEMA_INFO = """
SCHÉMA SQL :
1. vehicules : id, immatriculation, type, capacite, statut (actif, maintenance, hors_service)
2. chauffeurs : id, nom, prenom, téléphone
3. trajets : id, ligne_id, chauffeur_id, vehicule_id, statut, recette
4. incidents : id, trajet_id, type, description, gravite
5. affectations : id, chauffeur_id, vehicule_id

LIENS :
- Chauffeur -> Trajets : t.chauffeur_id = c.id
- Incident -> Trajets : i.trajet_id = t.id
"""

FEW_SHOT_EXAMPLES = """
EXEMPLES :
Q: "combien d'incident pour Awa FAYE ?"
A: {
  "sql": "SELECT COUNT(i.id) FROM incidents i JOIN trajets t ON i.trajet_id = t.id JOIN chauffeurs c ON t.chauffeur_id = c.id WHERE c.nom = 'FAYE' AND c.prenom = 'Awa'",
  "answer": "Awa FAYE a X incidents."
}
"""

def generate_system_prompt(db: Session):
    samples = get_table_samples(db)
    return f"""Tu es un assistant d'aide à la décision pour la gestion de transport. 
Tu traduis les questions en requêtes SQL.

{SCHEMA_INFO}

{samples}

{FEW_SHOT_EXAMPLES}

CONSIGNES :
1. Utilise uniquement des SELECT.
2. Utilise des alias (i, t, c).
3. Retourne au format JSON : {{"sql": "...", "answer": "..."}}.
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
