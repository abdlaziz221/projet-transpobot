from fastapi import APIRouter, Depends, Request
import os
import httpx
import re
import json
import logging
import hashlib
from datetime import datetime
from sqlalchemy import text
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

# ─────────────────────────────────────────────
# CACHE SQL  (clé = hash de la question normalisée)
# ─────────────────────────────────────────────
SQL_CACHE: dict[str, str] = {}

def _cache_key(question: str) -> str:
    return hashlib.md5(question.strip().lower().encode()).hexdigest()


# ─────────────────────────────────────────────
# SCHÉMA COMPLET (mis à jour avec plannings + affectations)
# ─────────────────────────────────────────────
SCHEMA_INFO = """
=== SCHÉMA COMPLET DE LA BASE DE DONNÉES ===

TABLE vehicules       : id, immatriculation, type, capacite, statut ('actif'|'maintenance'|'inactif'), kilometrage, date_acquisition
TABLE chauffeurs      : id, nom, prenom, telephone, numero_permis, categorie_permis, disponibilite (0/1), date_embauche
TABLE lignes          : id, code, nom, origine, destination, distance_km, duree_minutes
TABLE trajets         : id, ligne_id, chauffeur_id, vehicule_id, date_heure_depart, statut, nb_passagers, recette
TABLE incidents       : id, trajet_id, type, description, gravite ('mineure'|'moyenne'|'grave'), resolu (0/1)
TABLE maintenance     : id, vehicule_id, type, description, date_prevue, date_realisee, cout, kilometrage, effectuee (0/1)
TABLE tarifs          : id, ligne_id, type_client ('normal'|'etudiant'), prix, date_debut, date_fin
TABLE plannings       : id, ligne_id, chauffeur_id, vehicule_id, date_heure_depart_prevue, date_heure_arrivee_prevue, statut
TABLE affectations    : id, chauffeur_id, vehicule_id, date_debut, date_fin
TABLE utilisateurs    : id, username, role ('admin'|'manager'|'driver'), created_at

=== JOINTURES STANDARD (TOUJOURS utiliser ces alias) ===
trajets t  JOIN chauffeurs c  ON t.chauffeur_id = c.id
trajets t  JOIN lignes l      ON t.ligne_id     = l.id
trajets t  JOIN vehicules v   ON t.vehicule_id  = v.id
incidents i JOIN trajets t    ON i.trajet_id    = t.id
maintenance m JOIN vehicules v ON m.vehicule_id  = v.id
tarifs tf  JOIN lignes l      ON tf.ligne_id    = l.id
plannings p JOIN chauffeurs c ON p.chauffeur_id = c.id
plannings p JOIN vehicules v  ON p.vehicule_id  = v.id
affectations a JOIN chauffeurs c ON a.chauffeur_id = c.id
affectations a JOIN vehicules v  ON a.vehicule_id  = v.id

=== RÈGLES SQL CRITIQUES ===
- Toujours utiliser LIKE '%valeur%' pour rechercher des noms/villes (pas =)
- Les noms de chauffeurs sont en MAJUSCULES dans la BDD (ex: 'DIOP' pas 'Diop')
- Pour les dates : utiliser DATE() pour comparer seulement la partie date
- disponibilite = 1 → chauffeur disponible ; = 0 → indisponible
- effectuee = 1 → maintenance faite ; = 0 → en attente
- resolu = 1 → incident résolu ; = 0 → en cours
"""

# ─────────────────────────────────────────────
# FEW-SHOT EXAMPLES  (enrichis avec cas réels du schéma)
# ─────────────────────────────────────────────
FEW_SHOT_EXAMPLES = """
=== EXEMPLES DE RÉFÉRENCE ===

Q: "combien d'incidents graves pour Mamadou DIOP ?"
SQL: SELECT COUNT(i.id) AS nb_incidents FROM incidents i JOIN trajets t ON i.trajet_id = t.id JOIN chauffeurs c ON t.chauffeur_id = c.id WHERE UPPER(c.nom) = 'DIOP' AND UPPER(c.prenom) = 'MAMADOU' AND i.gravite = 'grave'

Q: "recette totale de la ligne Dakar - Thiès ce mois ?"
SQL: SELECT SUM(t.recette) AS recette_totale FROM trajets t JOIN lignes l ON t.ligne_id = l.id WHERE l.nom LIKE '%Dakar%Thiès%' AND DATE_FORMAT(t.date_heure_depart, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')

Q: "quels véhicules sont en maintenance ?"
SQL: SELECT v.immatriculation, v.type, v.kilometrage FROM vehicules v WHERE v.statut = 'maintenance'

Q: "chauffeurs disponibles aujourd'hui ?"
SQL: SELECT c.nom, c.prenom, c.telephone FROM chauffeurs c WHERE c.disponibilite = 1

Q: "top 5 des chauffeurs avec le plus de trajets ?"
SQL: SELECT c.nom, c.prenom, COUNT(t.id) AS nb_trajets FROM trajets t JOIN chauffeurs c ON t.chauffeur_id = c.id GROUP BY c.id, c.nom, c.prenom ORDER BY nb_trajets DESC LIMIT 5

Q: "maintenances non effectuées cette semaine ?"
SQL: SELECT v.immatriculation, m.type, m.description, m.date_prevue, m.cout FROM maintenance m JOIN vehicules v ON m.vehicule_id = v.id WHERE m.effectuee = 0 AND m.date_prevue BETWEEN DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AND DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 6 DAY)

Q: "quel est le tarif étudiant pour aller à Mbour ?"
SQL: SELECT l.nom, tf.prix FROM tarifs tf JOIN lignes l ON tf.ligne_id = l.id WHERE l.destination LIKE '%Mbour%' AND tf.type_client = 'etudiant' AND CURDATE() BETWEEN tf.date_debut AND tf.date_fin

Q: "taux d'occupation moyen par ligne ?"
SQL: SELECT l.nom, l.code, AVG(t.nb_passagers) AS moy_passagers, l.capacite_max FROM trajets t JOIN lignes l ON t.ligne_id = l.id GROUP BY l.id, l.nom, l.code ORDER BY moy_passagers DESC

Q: "incidents non résolus par gravité ?"
SQL: SELECT i.gravite, COUNT(*) AS nb FROM incidents i WHERE i.resolu = 0 GROUP BY i.gravite ORDER BY FIELD(i.gravite, 'grave', 'moyenne', 'mineure')

Q: "planning de demain ?"
SQL: SELECT p.date_heure_depart_prevue, l.nom AS ligne, CONCAT(c.prenom, ' ', c.nom) AS chauffeur, v.immatriculation FROM plannings p JOIN lignes l ON p.ligne_id = l.id JOIN chauffeurs c ON p.chauffeur_id = c.id JOIN vehicules v ON p.vehicule_id = v.id WHERE DATE(p.date_heure_depart_prevue) = DATE_ADD(CURDATE(), INTERVAL 1 DAY) ORDER BY p.date_heure_depart_prevue
"""

# ─────────────────────────────────────────────
# DÉTECTION D'INTENTION  (questions sans SQL nécessaire)
# ─────────────────────────────────────────────
CONVERSATIONAL_PATTERNS = [
    r"\b(bonjour|salut|bonsoir|hello|hi)\b",
    r"\b(merci|thank|bravo)\b",
    r"\b(comment (vas|allez|tu|vous))\b",
    r"\b(qui es.tu|c'est quoi|présente.toi)\b",
    r"\b(aide|help|que peux.tu|fonctionnalité)\b",
]

CONVERSATIONAL_RESPONSES = {
    "greeting": "Bonjour ! Je suis TranspoBot, votre assistant de gestion de transport. Posez-moi des questions sur les trajets, chauffeurs, véhicules, incidents ou finances !",
    "help": (
        "Je peux vous aider sur :\n"
        "• 🚌 **Véhicules** – statuts, kilométrages, types\n"
        "• 👤 **Chauffeurs** – disponibilités, performances, incidents\n"
        "• 🛣️ **Lignes & Trajets** – recettes, passagers, planning\n"
        "• 🔧 **Maintenance** – coûts, plannings, retards\n"
        "• ⚠️ **Incidents** – gravité, résolution\n"
        "• 💰 **Tarifs** – prix normal/étudiant par ligne\n\n"
        "Exemple : *'Top 5 chauffeurs avec le plus d'incidents ce mois ?'*"
    ),
    "thanks": "Avec plaisir ! N'hésitez pas si vous avez d'autres questions 😊",
    "identity": "Je suis TranspoBot, un assistant IA spécialisé dans l'analyse de vos données de transport au Sénégal. Je génère des requêtes SQL et interprète les résultats pour vous.",
}

def detect_conversational_intent(question: str) -> str | None:
    q = question.lower()
    if re.search(CONVERSATIONAL_PATTERNS[0], q): return "greeting"
    if re.search(CONVERSATIONAL_PATTERNS[4], q): return "help"
    if re.search(CONVERSATIONAL_PATTERNS[2], q): return "thanks"  # merci
    if re.search(CONVERSATIONAL_PATTERNS[3], q): return "identity"
    return None


# ─────────────────────────────────────────────
# DONNÉES D'EXEMPLE  (pour ancrer le LLM dans la réalité)
# ─────────────────────────────────────────────
def get_table_samples(db: Session) -> str:
    tables = ["vehicules", "chauffeurs", "lignes", "trajets", "incidents", "maintenance", "plannings", "tarifs", "affectations"]
    context = "\n=== APERÇU DES DONNÉES (1 ligne par table) ===\n"
    for table in tables:
        try:
            result = db.execute(text(f"SELECT * FROM `{table}` LIMIT 1"))
            row = result.fetchone()
            if row:
                d = dict(zip(result.keys(), row))
                for k, v in d.items():
                    if hasattr(v, 'isoformat'): d[k] = v.isoformat()
                context += f"• {table} : {json.dumps(d, ensure_ascii=False)}\n"
        except Exception:
            continue
    return context


# ─────────────────────────────────────────────
# CONSTRUCTION DU PROMPT SYSTÈME
# ─────────────────────────────────────────────
def build_system_prompt(db: Session) -> str:
    samples = get_table_samples(db)
    today = datetime.now().strftime("%A %d %B %Y")
    return f"""Tu es TranspoBot, un expert en analyse de données de transport routier au Sénégal.
La date d'aujourd'hui est : {today}

{SCHEMA_INFO}

{samples}

{FEW_SHOT_EXAMPLES}

=== INSTRUCTIONS STRICTES ===
1. Analyse l'INTENTION de la question avant de générer le SQL.
2. Si la question est vague (ex: "montre les trajets"), utilise des LIMIT 20 et des ORDER BY pertinents.
3. Pour les calculs financiers, retourne toujours les colonnes avec des alias lisibles (AS recette_totale, AS nb_trajets...).
4. Si plusieurs tables sont concernées, fais des JOIN complets plutôt que des sous-requêtes.
5. N'utilise JAMAIS INSERT, UPDATE, DELETE, DROP — lecture seule uniquement.
6. Si la question est ambiguë, génère la requête la plus inclusive possible.
7. Retourne UNIQUEMENT ce JSON valide, rien d'autre :
{{"sql": "SELECT ...", "answer": "Phrase de réponse courte anticipée", "intent": "type_de_question"}}

Les valeurs possibles pour "intent" : statistique | liste | recherche | planning | financier | maintenance | incident | conversationnel
"""


# ─────────────────────────────────────────────
# APPEL LLM  (Ollama local ou API cloud)
# ─────────────────────────────────────────────
async def invoke_llm(messages: list, options: dict | None = None) -> str:
    base_url = os.getenv("LLM_BASE_URL", "http://localhost:11434").rstrip("/")
    api_key  = os.getenv("LLM_API_KEY", "")
    model    = os.getenv("LLM_MODEL", "mistral")

    is_cloud = any(svc in base_url for svc in ["api.groq.com", "openai.com", "anthropic.com"])
    url      = f"{base_url}/chat/completions" if is_cloud else f"{base_url}/api/chat"

    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload: dict = {"model": model, "messages": messages, "temperature": 0.0, "stream": False}

    if not is_cloud:
        opts = options.copy() if options else {}
        opts.setdefault("num_gpu", 99)
        opts.setdefault("num_ctx", 4096)
        require_json = opts.pop("require_json", False)
        if opts:
            payload["options"] = opts
        if require_json:
            payload["format"] = "json"
    else:
        if options and "num_predict" in options:
            payload["max_tokens"] = options["num_predict"]

    async with httpx.AsyncClient() as client:
        resp = await client.post(url, json=payload, headers=headers, timeout=180.0)

    resp.raise_for_status()
    data = resp.json()
    return data["choices"][0]["message"]["content"] if is_cloud else data["message"]["content"]


# ─────────────────────────────────────────────
# EXTRACTION JSON  (robuste face aux modèles bavards)
# ─────────────────────────────────────────────
def extract_json(raw: str) -> dict:
    """Extrait le premier objet JSON valide depuis une réponse LLM potentiellement bruitée."""
    # Supprime les blocs markdown ```json ... ```
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()
    # Cherche le premier {...}
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        return json.loads(match.group(0))
    return json.loads(cleaned)


# ─────────────────────────────────────────────
# CORRECTION SQL AUTOMATIQUE  (retry si erreur BDD)
# ─────────────────────────────────────────────
async def auto_fix_sql(original_sql: str, error_msg: str, question: str) -> str | None:
    """Demande au LLM de corriger une requête SQL qui a échoué."""
    fix_messages = [
        {
            "role": "system",
            "content": (
                "Tu es un expert MySQL. Corrige la requête SQL ci-dessous qui a produit une erreur. "
                "Retourne UNIQUEMENT la requête SQL corrigée, sans explication, sans markdown."
            )
        },
        {
            "role": "user",
            "content": (
                f"Question originale : {question}\n"
                f"Requête SQL fautive :\n{original_sql}\n"
                f"Erreur MySQL :\n{error_msg}\n\n"
                "Génère une requête corrigée qui répond à la question :"
            )
        }
    ]
    try:
        fixed = await invoke_llm(fix_messages, options={"require_json": False})
        # Nettoie les balises markdown éventuelles
        fixed = re.sub(r"```(?:sql)?", "", fixed).strip().rstrip("`").strip()
        return fixed if fixed.upper().startswith("SELECT") else None
    except Exception as e:
        logging.warning(f"Auto-fix SQL failed: {e}")
        return None


# ─────────────────────────────────────────────
# SYNTHÈSE INTELLIGENTE DES RÉSULTATS
# ─────────────────────────────────────────────
async def synthesize_answer(question: str, data: list, intent: str) -> str:
    """Génère une réponse naturelle en français à partir des données SQL."""
    if not data:
        return "Aucun résultat trouvé pour cette requête dans la base de données."

    # Pour les listes longues, on ne génère pas de synthèse LLM
    if len(data) > 3:
        return f"J'ai trouvé **{len(data)} résultats** correspondant à votre demande. Consultez le tableau ci-dessous."

    # Synthèse LLM pour 1 à 3 lignes de résultats
    data_str = json.dumps(data, ensure_ascii=False, indent=2)
    synth_prompt = (
        f"Question : « {question} »\n"
        f"Intent : {intent}\n"
        f"Résultat de la base de données :\n{data_str}\n\n"
        "Rédige UNE réponse claire et naturelle en français. "
        "Intègre TOUTES les valeurs numériques exactes du résultat. "
        "Adapte le ton selon l'intent (statistique → chiffres précis, liste → énumération courte). "
        "Maximum 2 phrases."
    )
    synth_messages = [
        {"role": "system", "content": "Tu es un analyste de transport. Tu formules des réponses précises basées sur des données réelles. Aucun placeholder comme 'X' ou '[Nom]'."},
        {"role": "user", "content": synth_prompt}
    ]
    ans = await invoke_llm(synth_messages, options={"require_json": False})
    ans = ans.strip().replace('"', '').replace('\n', ' ')
    # Sécurité : si le LLM renvoie du JSON ou un placeholder
    if ans.startswith(("{", "[")) or re.search(r"\bX\b|\[.*\]", ans):
        return _fallback_summary(data, intent)
    return ans


def _fallback_summary(data: list, intent: str) -> str:
    """Résumé de secours sans LLM."""
    if not data:
        return "Aucune donnée."
    row = data[0]
    # Essaie de trouver une valeur numérique ou textuelle significative
    for k, v in row.items():
        if isinstance(v, (int, float)) and v > 0:
            return f"Résultat : **{v:,.0f}** ({k.replace('_', ' ')})."
    return f"Résultat disponible dans le tableau ({len(data)} ligne(s))."


# ─────────────────────────────────────────────
# ENDPOINT PRINCIPAL
# ─────────────────────────────────────────────
@router.post("/chat")
@limiter.limit("15/minute")
async def chat(
    req: ChatReq,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    try:
        question = req.question.strip()
        q_lower  = question.lower()

        # ── 0. RÉPONSES CONVERSATIONNELLES (sans SQL) ──────────────────────
        intent_conv = detect_conversational_intent(q_lower)
        if intent_conv and not req.history:
            return {"answer": CONVERSATIONAL_RESPONSES[intent_conv], "sql": None, "data": [], "intent": "conversationnel"}

        # ── 1. CACHE SQL ────────────────────────────────────────────────────
        cache_key = _cache_key(question)
        sql    = None
        intent = "statistique"
        o      = {}

        if cache_key in SQL_CACHE and not req.history:
            logging.info("CACHE HIT")
            sql = SQL_CACHE[cache_key]
        else:
            # ── 2. GÉNÉRATION SQL (PASS 1) ───────────────────────────────
            system_prompt = build_system_prompt(db)
            messages = [{"role": "system", "content": system_prompt}]

            # Historique de conversation (6 derniers tours max)
            for msg in req.history[-6:]:
                messages.append({"role": msg.role, "content": msg.content})

            messages.append({"role": "user", "content": question})

            raw = await invoke_llm(
                messages,
                options={"require_json": True}
            )
            logging.info(f"PASS1 raw: {raw[:200]}")

            try:
                o      = extract_json(raw)
                sql    = o.get("sql", "").strip()
                intent = o.get("intent", "statistique")
            except (json.JSONDecodeError, ValueError) as e:
                logging.error(f"JSON parse error: {e} | raw: {raw}")
                return {"answer": "Je n'ai pas pu interpréter votre question. Reformulez-la.", "sql": None, "data": [], "intent": "erreur"}

            # Sécurité : rejette toute requête non-SELECT
            if sql and not sql.upper().lstrip().startswith("SELECT"):
                return {"answer": "Seules les requêtes de lecture sont autorisées.", "sql": None, "data": [], "intent": "sécurité"}

            if sql and not req.history:
                SQL_CACHE[cache_key] = sql

        # ── 3. EXÉCUTION SQL ────────────────────────────────────────────────
        data: list = []
        if sql:
            try:
                result = db.execute(text(sql))
                keys   = list(result.keys())
                rows   = result.fetchall()
                data   = [dict(zip(keys, row)) for row in rows]
                # Sérialisation des dates/datetime
                for row in data:
                    for k, v in row.items():
                        if hasattr(v, "isoformat"):
                            row[k] = v.isoformat()
                        elif v is None:
                            row[k] = None

            except SQLAlchemyError as db_err:
                err_str = str(db_err)[:300]
                logging.error(f"SQL Error: {err_str}")

                # ── AUTO-CORRECTION SQL ──────────────────────────────────
                fixed_sql = await auto_fix_sql(sql, err_str, question)
                if fixed_sql:
                    logging.info(f"Auto-fix SQL: {fixed_sql}")
                    try:
                        result = db.execute(text(fixed_sql))
                        keys   = list(result.keys())
                        rows   = result.fetchall()
                        data   = [dict(zip(keys, row)) for row in rows]
                        for row in data:
                            for k, v in row.items():
                                if hasattr(v, "isoformat"): row[k] = v.isoformat()
                        sql = fixed_sql  # Met à jour pour la réponse
                    except SQLAlchemyError as e2:
                        logging.error(f"Auto-fix also failed: {e2}")
                        return {
                            "answer": "La requête a échoué même après correction automatique. Reformulez votre question.",
                            "sql": sql, "data": [], "intent": intent
                        }
                else:
                    return {
                        "answer": f"Erreur SQL : {err_str[:100]}",
                        "sql": sql, "data": [], "intent": intent
                    }

        # ── 4. SYNTHÈSE INTELLIGENTE (PASS 2) ──────────────────────────────
        if sql and data is not None:
            ans = await synthesize_answer(question, data, intent)
        else:
            ans = o.get("answer") or "Aucune donnée trouvée pour cette question."

        return {"answer": ans, "sql": sql, "data": data, "intent": intent}

    except Exception as e:
        import traceback
        logging.error(f"GLOBAL ERROR: {e}\n{traceback.format_exc()}")
        return {
            "answer": f"Une erreur inattendue s'est produite : {str(e)[:80]}",
            "sql": None, "data": [], "intent": "erreur"
        }
