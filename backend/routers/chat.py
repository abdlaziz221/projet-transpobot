from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
import os
import asyncio
import httpx
import re
import json
import logging
import hashlib
import time
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
# CLIENT HTTP PERSISTANT  (réutilisé entre les requêtes)
# ─────────────────────────────────────────────
_http_client: httpx.AsyncClient | None = None

def get_http_client() -> httpx.AsyncClient:
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=120.0)
    return _http_client

# ─────────────────────────────────────────────
# CACHE SQL  (clé = hash de la question normalisée)
# ─────────────────────────────────────────────
SQL_CACHE: dict[str, str] = {}

# ─────────────────────────────────────────────
# CACHE SYSTEM PROMPT  (TTL 5 minutes — évite 9 requêtes DB par chat)
# ─────────────────────────────────────────────
_PROMPT_CACHE: dict = {"prompt": None, "ts": 0.0}
_PROMPT_TTL = 300  # secondes

def _cache_key(question: str) -> str:
    return hashlib.md5(question.strip().lower().encode()).hexdigest()


# ─────────────────────────────────────────────
# SCHÉMA COMPACT  (~120 tokens au lieu de 600)
# ─────────────────────────────────────────────
SCHEMA_INFO = """Base MySQL — schéma complet :
vehicules(id,immatriculation TEXT,type TEXT[Bus/Minibus/Express],capacite INT,statut TEXT[actif/inactif/maintenance],kilometrage INT,date_acquisition DATE)
chauffeurs(id,nom TEXT,prenom TEXT,telephone TEXT,numero_permis TEXT,disponibilite BOOL[0/1],date_embauche DATE)
lignes(id,code TEXT,nom TEXT,origine TEXT,destination TEXT,distance_km INT,duree_minutes INT)
trajets(id,ligne_id FK,chauffeur_id FK,vehicule_id FK,date_heure_depart DATETIME,date_heure_arrivee DATETIME,statut TEXT[termine/en_cours/annule/planifie],nb_passagers INT,recette INT)
incidents(id,trajet_id FK→trajets.id,type TEXT,gravite TEXT[faible/moyen/grave],description TEXT,date_incident DATETIME,resolu BOOL[0/1])
maintenance(id,vehicule_id FK,type TEXT,description TEXT,date_prevue DATE,cout INT,kilometrage INT,effectuee BOOL[0/1])
tarifs(id,ligne_id FK,type_client TEXT[normal/etudiant],prix INT,date_debut DATE,date_fin DATE)
plannings(id,ligne_id FK,chauffeur_id FK,vehicule_id FK,date_heure_depart_prevue DATETIME,statut TEXT[planifie/effectue/annule])
JOINTURES: incidents→trajets(trajet_id), trajets→chauffeurs(chauffeur_id), trajets→vehicules(vehicule_id), trajets→lignes(ligne_id)
MySQL: CONCAT(a,' ',b) pour concat, DATE_FORMAT(col,'%Y-%m') pour mois, CURDATE() pour aujourd'hui, DATE_SUB(CURDATE(),INTERVAL N DAY/MONTH) pour dates relatives"""

# ─────────────────────────────────────────────
# FEW-SHOT EXAMPLES  (exemples JSON compacts)
# ─────────────────────────────────────────────
FEW_SHOT_EXAMPLES = """Exemples JSON (respecte exactement ce format) :
Q:chauffeurs disponibles→{"sql":"SELECT nom,prenom,telephone FROM chauffeurs WHERE disponibilite=1 ORDER BY nom","answer":"Chauffeurs disponibles:","intent":"liste"}
Q:recette totale→{"sql":"SELECT SUM(recette) AS total FROM trajets WHERE statut='termine'","answer":"Recette totale:","intent":"financier"}
Q:incidents graves non résolus→{"sql":"SELECT COUNT(*) AS nb FROM incidents WHERE gravite='grave' AND resolu=0","answer":"Incidents graves ouverts:","intent":"statistique"}
Q:chauffeur avec le plus d'incidents→{"sql":"SELECT CONCAT(c.prenom,' ',c.nom) AS chauffeur,COUNT(i.id) AS nb_incidents FROM incidents i JOIN trajets t ON i.trajet_id=t.id JOIN chauffeurs c ON t.chauffeur_id=c.id GROUP BY c.id ORDER BY nb_incidents DESC LIMIT 5","answer":"Chauffeurs par incidents:","intent":"statistique"}
Q:recettes par mois→{"sql":"SELECT DATE_FORMAT(date_heure_depart, '%Y-%m') AS mois,SUM(recette) AS total FROM trajets WHERE statut='termine' GROUP BY mois ORDER BY mois DESC LIMIT 6","answer":"Recettes par mois:","intent":"financier"}
Q:véhicules en maintenance→{"sql":"SELECT v.immatriculation,v.type,m.type AS maintenance,m.date_prevue FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id WHERE m.effectuee=0 ORDER BY m.date_prevue","answer":"Véhicules en maintenance:","intent":"maintenance"}
Q:taux occupation lignes→{"sql":"SELECT l.nom,ROUND(AVG(t.nb_passagers*100.0/v.capacite),1) AS taux_pct FROM trajets t JOIN vehicules v ON t.vehicule_id=v.id JOIN lignes l ON t.ligne_id=l.id WHERE t.statut='termine' AND v.capacite>0 GROUP BY l.id ORDER BY taux_pct DESC","answer":"Taux d'occupation:","intent":"statistique"}"""

# ─────────────────────────────────────────────
# NORMALISATION  (accents + alias métier)
# ─────────────────────────────────────────────
def _normalize(text: str) -> str:
    """Supprime les accents pour comparaison robuste."""
    replacements = str.maketrans("éèêëàâùûüîïôçœæÉÈÊËÀÂÙÛÜÎÏÔÇ", "eeeeeauuuiiocoeEEEEAAUUUIIOC")
    return text.translate(replacements)

# Synonymes → terme canonique (appliqué avant tout matching)
_ALIASES = {
    # Chauffeur
    r"\b(conducteur|pilote|chauffeur[s]?|driver|personnel)\b": "chauffeur",
    # Véhicule
    r"\b(bus|autobus|minibus|camion|autocar|car|vehicle|vehicule[s]?)\b": "vehicule",
    # Incident
    r"\b(accident|panne|avarie|probleme|alerte|anomalie|sinistre)\b": "incident",
    # Recette
    r"\b(benefice|profit|argent|revenu|chiffre|gain|ca\b|billet[s]?)\b": "recette",
    # Ligne
    r"\b(route|itineraire|circuit|parcours|axe|liaison)\b": "ligne",
    # Maintenance
    r"\b(reparation|entretien|revision|service|garage)\b": "maintenance",
    # Passagers
    r"\b(client[s]?|voyageur[s]?|usager[s]?|gens)\b": "passager",
    # Intentions chiffres
    r"\b(y'?a.{0,4}combien|il.{0,4}(y.{0,2})?a.{0,4}combien|c'est.{0,4}combien|dis.moi.{0,5}combien)\b": "combien",
    r"\b(montre.moi|donne.moi|affiche|liste.moi|voir|montrer|afficher)\b": "liste",
    r"\b(chiffre[s]?|stat[s]?|statistique[s]?|kpi|resume|bilan|rapport|overview)\b": "stat",
    r"\b(aujourd'?hui|ce.jour|journee)\b": "aujourd",
    r"\b(ce.?mois|mois.en.cours|mensuel)\b": "mois",
    r"\b(cette.?semaine|semaine.en.cours|hebdo)\b": "semaine",
}

def _expand_question(q: str) -> str:
    """Normalise accents + remplace les alias par les termes canoniques."""
    qn = _normalize(q.lower())
    for pattern, replacement in _ALIASES.items():
        qn = re.sub(pattern, replacement, qn)
    return qn


# ─────────────────────────────────────────────
# DÉTECTION HORS CONTEXTE
# ─────────────────────────────────────────────
_OUT_OF_CONTEXT_PATTERNS = re.compile(
    r"(meteo|temps.qu'il|heure.qu'il.est|quelle.heure|foot(ball)?|sport|politique|musique|"
    r"recette.de.cuisine|comment.cuisiner|film|serie|chanson|prix.de.l'or|bourse|crypto|bitcoin|"
    r"traduction|translate|wikipedia|google|facebook|instagram|youtube|whatsapp|"
    r"blague|joke|histoire.drole|jeu|game|horoscope|signe.zodiaque|amour|relation|"
    r"president|gouvernement|election|loi|droit|medecin|maladie|sante|pharmacie|"
    r"capitale.de|pays|geographie|calcul|mathematique|equation)"
)

OUT_OF_CONTEXT_RESPONSE = (
    "Je suis spécialisé dans la **gestion de transport** 🚌 — je ne peux pas répondre à cette question.\n\n"
    "En revanche, posez-moi des questions comme :\n"
    "• *'Combien de trajets cette semaine ?'*\n"
    "• *'Quel chauffeur a le plus d'incidents ?'*\n"
    "• *'Recettes du mois par ligne'*"
)


# ─────────────────────────────────────────────
# DÉTECTION D'INTENTION CONVERSATIONNELLE
# ─────────────────────────────────────────────
CONVERSATIONAL_PATTERNS = {
    "greeting": r"(bonjour|salut|bonsoir|\bhello\b|\bhi\b|\bsalam\b|bonne\s*(matin|apres|soir)|good\s*(morning|evening|afternoon)|cv\b|ca.va\b)",
    "thanks":   r"(merci|thank|bravo|parfait|excellent|nickel|genial|super.?bot|c.est\s*(bon|bien|super|ok|cool|top)|d.accord|\bok\s*$|bien.recu|impeccable|chapeau)",
    "help":     r"(\baide\b|\bhelp\b|que\s*peux.tu|fonctionnalite|qu.est.ce\s*que\s*tu|comment.*utiliser|que.*faire|\bmenu\b|capacite|ce\s*que\s*tu\s*(sais|peux|fais))",
    "identity": r"(qui\s*(es|etes).*(tu|vous)|presente.toi|c.est\s*quoi|tu\s*(es|fais|sais)|\btranspobot\b|\bassistant\b|\bbot\b|IA\b|intelligence)",
    "positive":  r"(wow|waow|impressionnant|incroyable|trop.fort|magnifique|parfaitement|exactement|c.est.ca|voila.?!|super.?!|bien.joue|bravo.?!)",
}

CONVERSATIONAL_RESPONSES = {
    "greeting": (
        "Bonjour ! 👋 Je suis **TranspoBot**, votre assistant IA de gestion de transport.\n\n"
        "Posez-moi vos questions sur :\n"
        "• 🚌 Véhicules, chauffeurs, lignes\n"
        "• 🛣️ Trajets, recettes, passagers\n"
        "• 🔧 Maintenance et incidents\n\n"
        "Exemples : *'Combien de trajets cette semaine ?'* · *'Quel bus nécessite une réparation ?'*"
    ),
    "help": (
        "Voici ce que je sais faire :\n\n"
        "• 🚌 **Véhicules** — statuts, kilométrages, types, capacités\n"
        "• 👤 **Chauffeurs** — disponibilités, performances, ancienneté\n"
        "• 🛣️ **Lignes & Trajets** — recettes, passagers, planning, annulations\n"
        "• 🔧 **Maintenance** — coûts, plannings, urgences\n"
        "• ⚠️ **Incidents** — gravité, résolution, types\n"
        "• 💰 **Tarifs** — prix normal/étudiant par ligne\n"
        "• 📊 **Statistiques** — tableaux de bord, tendances, classements\n\n"
        "Posez votre question librement, je comprends le français naturel !"
    ),
    "thanks": "Avec plaisir ! 😊 N'hésitez pas si vous avez d'autres questions.",
    "identity": (
        "Je suis **TranspoBot Analyst** 🤖 — un assistant IA spécialisé dans l'analyse des données de transport.\n\n"
        "Je lis votre question en français, génère automatiquement une requête SQL sur votre base MySQL,"
        "exécute la requête et vous présente les résultats en langage naturel.\n\n"
        "Je peux analyser : véhicules, chauffeurs, trajets, lignes, incidents, maintenances et finances."
    ),
    "positive": "Merci ! 😄 Je suis là pour vous aider. Posez votre prochaine question !",
}

# Mots-clés qui indiquent une question métier (ne pas traiter comme hors-contexte)
_BUSINESS_RE = re.compile(
    r"(trajet|chauffeur|vehicule|incident|maintenance|ligne|recette|tarif|passager|km|planning|"
    r"conducteur|bus|accident|reparation|route|benefice|client|voyageur|"
    r"disponible|actif|en.cours|termine|annule|grave|flotte|transport)"
)

def detect_conversational_intent(question: str) -> str | None:
    """Détecte les intentions conversationnelles — fonctionne avec ou sans historique."""
    q  = question.strip().lower()
    qn = _normalize(q)
    # Ne pas traiter comme conversationnel si mots-clés métier présents
    if _BUSINESS_RE.search(qn):
        return None
    for intent, pattern in CONVERSATIONAL_PATTERNS.items():
        if re.search(pattern, qn):
            return intent
    # Fallback : question très courte sans mot métier → greeting
    if len(q) <= 12 and not _BUSINESS_RE.search(qn):
        return "greeting"
    return None


# ─────────────────────────────────────────────
# CONSTRUCTION DU PROMPT SYSTÈME  (compact, sans requêtes DB)
# ─────────────────────────────────────────────
def build_system_prompt() -> str:
    now = time.time()
    if _PROMPT_CACHE["prompt"] and (now - _PROMPT_CACHE["ts"]) < _PROMPT_TTL:
        return _PROMPT_CACHE["prompt"]
    today = datetime.now().strftime("%d/%m/%Y")
    prompt = f"""Tu es un expert SQL MySQL/MariaDB. Date:{today}
{SCHEMA_INFO}
{FEW_SHOT_EXAMPLES}
Règles MySQL : utilise CURDATE() (pas date('now')), DATE_FORMAT(col,'%Y-%m') pour mois, TIMESTAMPDIFF(YEAR,col,CURDATE()) pour ancienneté, CONCAT() pour concat de chaînes.
Réponds UNIQUEMENT JSON sans markdown:{{"sql":"SELECT...","answer":"réponse française","intent":"liste|statistique|financier|maintenance|incident"}}"""
    _PROMPT_CACHE["prompt"] = prompt
    _PROMPT_CACHE["ts"] = now
    return prompt


# ─────────────────────────────────────────────
# RACCOURCIS INSTANTANÉS  (bypass LLM pour requêtes fréquentes)
# ─────────────────────────────────────────────
_SHORTCUTS = [
    # == QUESTIONS VAGUES / ULTRA-COURTES (doivent être en tête) ==
    (r"^\s*(stat[s]?|kpi|bilan|resume|tableau.de.bord|dashboard|overview|situation|global|general)\s*[?!]?\s*$",
     "SELECT (SELECT COUNT(*) FROM vehicules WHERE statut='actif') AS vehicules_actifs, (SELECT COUNT(*) FROM vehicules) AS total_vehicules, (SELECT COUNT(*) FROM chauffeurs WHERE disponibilite=1) AS chauffeurs_disponibles, (SELECT COUNT(*) FROM incidents WHERE resolu=0) AS incidents_ouverts, (SELECT COUNT(*) FROM incidents WHERE gravite='grave' AND resolu=0) AS incidents_graves, (SELECT COALESCE(SUM(recette),0) FROM trajets WHERE statut='termine' AND date(date_heure_depart)=CURDATE()) AS recette_jour, (SELECT COUNT(*) FROM trajets WHERE date(date_heure_depart)=CURDATE()) AS trajets_aujourd_hui, (SELECT COUNT(*) FROM maintenance WHERE effectuee=0) AS maintenances_en_attente",
     "Tableau de bord :", "statistique"),
    (r"^\s*(chauffeur[s]?)\s*[?!]?\s*$",
     "SELECT nom, prenom, telephone, CASE disponibilite WHEN 1 THEN 'disponible' ELSE 'indisponible' END AS statut FROM chauffeurs ORDER BY disponibilite DESC, nom",
     "Liste des chauffeurs :", "liste"),
    (r"^\s*(vehicule[s]?|bus|flotte)\s*[?!]?\s*$",
     "SELECT immatriculation, type, statut, capacite, kilometrage FROM vehicules ORDER BY statut, immatriculation",
     "Liste des véhicules :", "liste"),
    (r"^\s*(incident[s]?)\s*[?!]?\s*$",
     "SELECT type, gravite, COUNT(*) AS nb, SUM(CASE WHEN resolu=0 THEN 1 ELSE 0 END) AS ouverts FROM incidents GROUP BY type, gravite ORDER BY CASE gravite WHEN 'grave' THEN 1 WHEN 'moyen' THEN 2 ELSE 3 END",
     "Incidents par type et gravité :", "statistique"),
    (r"^\s*(trajet[s]?)\s*[?!]?\s*$",
     "SELECT statut, COUNT(*) AS nb FROM trajets GROUP BY statut ORDER BY nb DESC",
     "Trajets par statut :", "statistique"),
    (r"^\s*(ligne[s]?|route[s]?)\s*[?!]?\s*$",
     "SELECT code, nom, origine, destination, distance_km FROM lignes ORDER BY code",
     "Liste des lignes :", "liste"),
    (r"^\s*(maintenance[s]?|reparation[s]?|entretien[s]?)\s*[?!]?\s*$",
     "SELECT v.immatriculation, m.type, m.date_prevue, m.cout, CASE m.effectuee WHEN 1 THEN 'effectuee' ELSE 'en attente' END AS statut FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id ORDER BY m.effectuee, m.date_prevue",
     "Liste des maintenances :", "maintenance"),
    (r"^\s*(recette[s]?|finance[s]?|argent|revenu[s]?|benefice)\s*[?!]?\s*$",
     "SELECT DATE_FORMAT(date_heure_depart, '%Y-%m') AS mois, SUM(recette) AS recette_totale, COUNT(*) AS nb_trajets FROM trajets WHERE statut='termine' GROUP BY mois ORDER BY mois DESC LIMIT 6",
     "Recettes par mois :", "financier"),
    (r"^\s*(planning|programme|agenda|calendrier)\s*[?!]?\s*$",
     "SELECT p.date_heure_depart_prevue, l.nom AS ligne, CONCAT(c.prenom,' ',c.nom) AS chauffeur, v.immatriculation, p.statut FROM plannings p JOIN lignes l ON p.ligne_id=l.id JOIN chauffeurs c ON p.chauffeur_id=c.id JOIN vehicules v ON p.vehicule_id=v.id WHERE date(p.date_heure_depart_prevue)=CURDATE() ORDER BY p.date_heure_depart_prevue",
     "Planning du jour :", "liste"),
    (r"^\s*(tarif[s]?|prix|billet[s]?|ticket[s]?)\s*[?!]?\s*$",
     "SELECT l.nom, tf.type_client, tf.prix FROM tarifs tf JOIN lignes l ON tf.ligne_id=l.id WHERE CURDATE() BETWEEN tf.date_debut AND tf.date_fin ORDER BY l.nom, tf.type_client",
     "Tarifs en vigueur :", "liste"),
    # == QUESTIONS AVEC "les/des + entité" → liste ==
    (r"^(les|des|tous.les|toutes.les|voir.les|montre.les|donne.moi.les|affiche.les|liste.des)\s+chauffeur",
     "SELECT nom, prenom, telephone, CASE disponibilite WHEN 1 THEN 'disponible' ELSE 'indisponible' END AS statut FROM chauffeurs ORDER BY disponibilite DESC, nom",
     "Liste des chauffeurs :", "liste"),
    (r"^(les|des|tous.les|voir.les|montre.les|donne.moi.les|affiche.les|liste.des)\s+vehicule",
     "SELECT immatriculation, type, statut, capacite, kilometrage FROM vehicules ORDER BY statut, immatriculation",
     "Liste des véhicules :", "liste"),
    (r"^(les|des|tous.les|voir.les|montre.les|donne.moi.les|affiche.les|liste.des)\s+incident",
     "SELECT type, gravite, description, CASE resolu WHEN 1 THEN 'resolu' ELSE 'ouvert' END AS etat FROM incidents ORDER BY CASE gravite WHEN 'grave' THEN 1 WHEN 'moyen' THEN 2 ELSE 3 END LIMIT 20",
     "Incidents :", "statistique"),
    (r"^(les|des|tous.les|voir.les|montre.les|donne.moi.les|affiche.les|liste.des)\s+trajet",
     "SELECT t.date_heure_depart, l.nom AS ligne, CONCAT(c.prenom,' ',c.nom) AS chauffeur, t.statut, t.nb_passagers FROM trajets t JOIN lignes l ON t.ligne_id=l.id JOIN chauffeurs c ON t.chauffeur_id=c.id ORDER BY t.date_heure_depart DESC LIMIT 15",
     "Derniers trajets :", "liste"),
    (r"^(les|des|toutes.les|voir.les|montre.les|donne.moi.les|affiche.les|liste.des)\s+ligne",
     "SELECT code, nom, origine, destination, distance_km FROM lignes ORDER BY code",
     "Liste des lignes :", "liste"),
    # == QUESTIONS AVEC "il y a combien de" ==
    (r"(il.{0,5}y.{0,5}a.{0,5}combien|y.{0,5}a.{0,5}(t.il.)?combien|c.est.quoi.le.nombre).{0,15}chauffeur",
     "SELECT disponibilite, COUNT(*) AS nb FROM chauffeurs GROUP BY disponibilite",
     "Répartition des chauffeurs :", "statistique"),
    (r"(il.{0,5}y.{0,5}a.{0,5}combien|y.{0,5}a.{0,5}(t.il.)?combien).{0,15}vehicule",
     "SELECT statut, COUNT(*) AS nb FROM vehicules GROUP BY statut",
     "Répartition des véhicules :", "statistique"),
    (r"(il.{0,5}y.{0,5}a.{0,5}combien|y.{0,5}a.{0,5}(t.il.)?combien).{0,15}incident",
     "SELECT gravite, COUNT(*) AS nb, SUM(CASE WHEN resolu=0 THEN 1 ELSE 0 END) AS ouverts FROM incidents GROUP BY gravite",
     "Incidents par gravité :", "statistique"),
    # == PRIORITE MAX : jointures complexes multi-tables ==
    (r"chauffeur.{0,40}(plus|max|beaucoup|davantage).{0,20}incident",
     "SELECT CONCAT(c.prenom,' ',c.nom) AS chauffeur, COUNT(i.id) AS nb_incidents, SUM(CASE WHEN i.gravite='grave' THEN 1 ELSE 0 END) AS graves, SUM(CASE WHEN i.resolu=0 THEN 1 ELSE 0 END) AS ouverts FROM incidents i JOIN trajets t ON i.trajet_id=t.id JOIN chauffeurs c ON t.chauffeur_id=c.id GROUP BY c.id ORDER BY nb_incidents DESC LIMIT 10",
     "Chauffeurs avec le plus d'incidents :", "statistique"),
    (r"(top|meilleur|classement).{0,15}chauffeur.{0,25}incident",
     "SELECT CONCAT(c.prenom,' ',c.nom) AS chauffeur, COUNT(i.id) AS nb_incidents FROM incidents i JOIN trajets t ON i.trajet_id=t.id JOIN chauffeurs c ON t.chauffeur_id=c.id GROUP BY c.id ORDER BY nb_incidents DESC LIMIT 10",
     "Classement chauffeurs par incidents :", "statistique"),
    (r"incident.{0,20}(par.{0,5})?chauffeur",
     "SELECT CONCAT(c.prenom,' ',c.nom) AS chauffeur, COUNT(i.id) AS nb_incidents, SUM(CASE WHEN i.gravite='grave' THEN 1 ELSE 0 END) AS graves FROM incidents i JOIN trajets t ON i.trajet_id=t.id JOIN chauffeurs c ON t.chauffeur_id=c.id GROUP BY c.id ORDER BY nb_incidents DESC LIMIT 15",
     "Incidents par chauffeur :", "statistique"),
    (r"chauffeur.{0,30}(plus|max|meilleur).{0,20}(trajet|voyage)",
     "SELECT CONCAT(c.prenom,' ',c.nom) AS chauffeur, COUNT(t.id) AS nb_trajets, SUM(t.recette) AS recette FROM trajets t JOIN chauffeurs c ON t.chauffeur_id=c.id WHERE t.statut='termine' GROUP BY c.id ORDER BY nb_trajets DESC LIMIT 10",
     "Top chauffeurs par trajets :", "statistique"),
    (r"chauffeur.{0,30}(plus|max|meilleur).{0,20}recette",
     "SELECT CONCAT(c.prenom,' ',c.nom) AS chauffeur, SUM(t.recette) AS recette_totale, COUNT(t.id) AS nb_trajets FROM trajets t JOIN chauffeurs c ON t.chauffeur_id=c.id WHERE t.statut='termine' GROUP BY c.id ORDER BY recette_totale DESC LIMIT 10",
     "Top chauffeurs par recette :", "financier"),
    (r"(recette|revenu).{0,20}(par.{0,5})?chauffeur",
     "SELECT CONCAT(c.prenom,' ',c.nom) AS chauffeur, SUM(t.recette) AS recette_totale, COUNT(t.id) AS nb_trajets, SUM(t.nb_passagers) AS passagers FROM trajets t JOIN chauffeurs c ON t.chauffeur_id=c.id WHERE t.statut='termine' GROUP BY c.id ORDER BY recette_totale DESC LIMIT 15",
     "Recettes par chauffeur :", "financier"),
    (r"ligne.{0,25}(plus|max).{0,20}(incident|probleme|panne)",
     "SELECT l.nom, l.code, COUNT(i.id) AS nb_incidents FROM incidents i JOIN trajets t ON i.trajet_id=t.id JOIN lignes l ON t.ligne_id=l.id GROUP BY l.id ORDER BY nb_incidents DESC LIMIT 10",
     "Lignes avec le plus d'incidents :", "statistique"),
    (r"incident.{0,20}(par.{0,5})?ligne",
     "SELECT l.nom, l.code, COUNT(i.id) AS nb_incidents, SUM(CASE WHEN i.gravite='grave' THEN 1 ELSE 0 END) AS graves FROM incidents i JOIN trajets t ON i.trajet_id=t.id JOIN lignes l ON t.ligne_id=l.id GROUP BY l.id ORDER BY nb_incidents DESC",
     "Incidents par ligne :", "statistique"),
    (r"passager.{0,25}(par.{0,5})?ligne",
     "SELECT l.nom, l.code, SUM(t.nb_passagers) AS total_passagers, COUNT(t.id) AS nb_trajets, ROUND(AVG(t.nb_passagers),0) AS moy_passagers FROM trajets t JOIN lignes l ON t.ligne_id=l.id WHERE t.statut='termine' GROUP BY l.id ORDER BY total_passagers DESC",
     "Passagers par ligne :", "statistique"),
    (r"passager.{0,25}(par.{0,5})?chauffeur",
     "SELECT CONCAT(c.prenom,' ',c.nom) AS chauffeur, SUM(t.nb_passagers) AS total_passagers, COUNT(t.id) AS nb_trajets FROM trajets t JOIN chauffeurs c ON t.chauffeur_id=c.id WHERE t.statut='termine' GROUP BY c.id ORDER BY total_passagers DESC LIMIT 10",
     "Passagers par chauffeur :", "statistique"),
    (r"v[eé]hicule.{0,25}(plus|max).{0,15}(km|kilom)",
     "SELECT immatriculation, type, statut, kilometrage FROM vehicules ORDER BY kilometrage DESC LIMIT 10",
     "Véhicules avec le plus de km :", "liste"),
    (r"v[eé]hicule.{0,25}(moins|min).{0,15}(km|kilom)",
     "SELECT immatriculation, type, statut, kilometrage FROM vehicules ORDER BY kilometrage ASC LIMIT 10",
     "Véhicules avec le moins de km :", "liste"),
    (r"(co[uû]t|montant|d[eé]pens).{0,20}maintenance.{0,20}(par.{0,5})?v[eé]hicule",
     "SELECT v.immatriculation, v.type, SUM(m.cout) AS cout_total, COUNT(m.id) AS nb_maintenances FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id GROUP BY v.id ORDER BY cout_total DESC LIMIT 10",
     "Coût de maintenance par véhicule :", "financier"),
    (r"maintenance.{0,20}(par.{0,5})?v[eé]hicule",
     "SELECT v.immatriculation, v.type, COUNT(m.id) AS nb_maintenances, SUM(m.cout) AS cout_total FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id GROUP BY v.id ORDER BY nb_maintenances DESC",
     "Maintenances par véhicule :", "maintenance"),
    (r"v[eé]hicule.{0,40}(n[eé]cessit|besoin|pr[eé]voir|faut|prochain|urgent).{0,30}maintenance",
     "SELECT v.immatriculation, v.type, v.kilometrage, m.type AS type_maintenance, m.date_prevue, DATEDIFF(m.date_prevue, CURDATE()) AS jours_restants FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id WHERE m.effectuee=0 ORDER BY m.date_prevue LIMIT 10",
     "Véhicules nécessitant une maintenance :", "maintenance"),
    (r"taux.{0,20}(occupation|remplissage|capacit)",
     "SELECT l.nom, l.code, ROUND(AVG(t.nb_passagers * 1.0/v.capacite*100),1) AS taux_occupation_pct, COUNT(t.id) AS nb_trajets FROM trajets t JOIN vehicules v ON t.vehicule_id=v.id JOIN lignes l ON t.ligne_id=l.id WHERE t.statut='termine' AND v.capacite>0 GROUP BY l.id ORDER BY taux_occupation_pct DESC",
     "Taux d'occupation par ligne :", "statistique"),
    (r"trajet.{0,25}(par.{0,5})?v[eé]hicule",
     "SELECT v.immatriculation, v.type, COUNT(t.id) AS nb_trajets, SUM(t.recette) AS recette FROM trajets t JOIN vehicules v ON t.vehicule_id=v.id WHERE t.statut='termine' GROUP BY v.id ORDER BY nb_trajets DESC LIMIT 10",
     "Trajets par véhicule :", "statistique"),
    # == COMPTES (combien) ==
    (r"combien.{0,20}chauffeur.{0,20}dispon",
     "SELECT COUNT(*) AS chauffeurs_disponibles FROM chauffeurs WHERE disponibilite=1",
     "Chauffeurs disponibles :", "statistique"),
    (r"combien.{0,20}chauffeur.{0,20}indispon",
     "SELECT COUNT(*) AS chauffeurs_indisponibles FROM chauffeurs WHERE disponibilite=0",
     "Chauffeurs indisponibles :", "statistique"),
    (r"combien.{0,20}chauffeur",
     "SELECT disponibilite, COUNT(*) AS nb FROM chauffeurs GROUP BY disponibilite",
     "Répartition des chauffeurs :", "statistique"),
    (r"combien.{0,20}v[eé]hicule.{0,20}actif",
     "SELECT COUNT(*) AS vehicules_actifs FROM vehicules WHERE statut='actif'",
     "Véhicules actifs :", "statistique"),
    (r"combien.{0,20}v[eé]hicule.{0,20}(maintenance|reparation)",
     "SELECT COUNT(*) AS en_maintenance FROM vehicules WHERE statut='maintenance'",
     "Véhicules en maintenance :", "statistique"),
    (r"combien.{0,20}v[eé]hicule",
     "SELECT statut, COUNT(*) AS nb FROM vehicules GROUP BY statut",
     "Répartition des véhicules :", "statistique"),
    (r"combien.{0,20}incident.{0,20}(grave|s[eé]rieux)",
     "SELECT COUNT(*) AS nb_graves, SUM(CASE WHEN resolu=0 THEN 1 ELSE 0 END) AS non_resolus FROM incidents WHERE gravite='grave'",
     "Incidents graves :", "statistique"),
    (r"combien.{0,20}incident.{0,20}(non.r[eé]solu|ouvert)",
     "SELECT COUNT(*) AS incidents_ouverts FROM incidents WHERE resolu=0",
     "Incidents ouverts :", "statistique"),
    (r"combien.{0,20}incident",
     "SELECT gravite, COUNT(*) AS nb, SUM(CASE WHEN resolu=0 THEN 1 ELSE 0 END) AS ouverts FROM incidents GROUP BY gravite",
     "Incidents par gravité :", "statistique"),
    (r"combien.{0,25}trajet.{0,25}(cette.semaine|semaine|7.jour|hebdo)",
     "SELECT COUNT(*) AS trajets_semaine, SUM(CASE WHEN statut='termine' THEN 1 ELSE 0 END) AS termines, SUM(CASE WHEN statut='en_cours' THEN 1 ELSE 0 END) AS en_cours FROM trajets WHERE date(date_heure_depart)>=DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
     "Trajets cette semaine :", "statistique"),
    (r"combien.{0,25}trajet.{0,25}(aujourd|du.jour|ce.jour|journ[eé]e)",
     "SELECT COUNT(*) AS trajets_aujourd_hui, SUM(CASE WHEN statut='termine' THEN 1 ELSE 0 END) AS termines FROM trajets WHERE date(date_heure_depart)=CURDATE()",
     "Trajets aujourd'hui :", "statistique"),
    (r"combien.{0,25}trajet.{0,25}(mois|mensuel)",
     "SELECT COUNT(*) AS trajets_mois, SUM(CASE WHEN statut='termine' THEN 1 ELSE 0 END) AS termines FROM trajets WHERE DATE_FORMAT(date_heure_depart, '%Y-%m')=DATE_FORMAT(date('now', '%Y-%m'))",
     "Trajets ce mois :", "statistique"),
    (r"combien.{0,20}trajet",
     "SELECT statut, COUNT(*) AS nb FROM trajets GROUP BY statut",
     "Trajets par statut :", "statistique"),
    (r"combien.{0,20}(ligne|itin[eé]raire|route)",
     "SELECT COUNT(*) AS total_lignes FROM lignes",
     "Nombre de lignes :", "statistique"),
    (r"combien.{0,20}maintenance",
     "SELECT effectuee, COUNT(*) AS nb FROM maintenance GROUP BY effectuee",
     "Maintenances par statut :", "statistique"),
    (r"combien.{0,20}passager.{0,25}(aujourd|du.jour|journ[eé]e)",
     "SELECT SUM(nb_passagers) AS passagers_jour, COUNT(*) AS nb_trajets FROM trajets WHERE statut='termine' AND date(date_heure_depart)=CURDATE()",
     "Passagers du jour :", "statistique"),
    (r"combien.{0,20}passager.{0,25}(semaine|7.jour)",
     "SELECT SUM(nb_passagers) AS passagers_semaine, COUNT(*) AS nb_trajets FROM trajets WHERE statut='termine' AND date(date_heure_depart)>=DATE_SUB(CURDATE(), INTERVAL 7 DAY)",
     "Passagers cette semaine :", "statistique"),
    (r"combien.{0,20}passager",
     "SELECT SUM(nb_passagers) AS total_passagers, ROUND(AVG(nb_passagers),0) AS moy_par_trajet FROM trajets WHERE statut='termine'",
     "Total passagers :", "statistique"),
    # == CHAUFFEURS ==
    (r"chauffeur[s]?.{0,10}dispon",
     "SELECT nom, prenom, telephone FROM chauffeurs WHERE disponibilite=1 ORDER BY nom",
     "Chauffeurs disponibles :", "liste"),
    (r"chauffeur[s]?.{0,10}indispon",
     "SELECT nom, prenom, telephone FROM chauffeurs WHERE disponibilite=0 ORDER BY nom",
     "Chauffeurs indisponibles :", "liste"),
    (r"(liste|tous|toutes?).{0,15}chauffeur",
     "SELECT nom, prenom, telephone, CASE disponibilite WHEN 1 THEN 'Disponible' ELSE 'Indisponible' END AS statut FROM chauffeurs ORDER BY nom",
     "Liste des chauffeurs :", "liste"),
    (r"(top|meilleur|performance).{0,15}chauffeur",
     "SELECT CONCAT(c.prenom,' ',c.nom) AS chauffeur, COUNT(t.id) AS nb_trajets, SUM(t.recette) AS recette_totale, SUM(t.nb_passagers) AS total_passagers FROM trajets t JOIN chauffeurs c ON t.chauffeur_id=c.id WHERE t.statut='termine' GROUP BY c.id ORDER BY nb_trajets DESC LIMIT 10",
     "Top chauffeurs :", "statistique"),
    (r"trajet.{0,25}(par.{0,5})?chauffeur",
     "SELECT CONCAT(c.prenom,' ',c.nom) AS chauffeur, COUNT(t.id) AS nb_trajets, SUM(t.recette) AS recette FROM trajets t JOIN chauffeurs c ON t.chauffeur_id=c.id WHERE t.statut='termine' GROUP BY c.id ORDER BY nb_trajets DESC LIMIT 15",
     "Trajets par chauffeur :", "statistique"),
    (r"chauffeur.{0,20}(anciennet[eé]|embauch|date)",
     "SELECT nom, prenom, date_embauche, TIMESTAMPDIFF(YEAR, date_embauche, CURDATE()) AS annees_service FROM chauffeurs ORDER BY date_embauche ASC",
     "Ancienneté des chauffeurs :", "liste"),
    # == VEHICULES ==
    (r"v[eé]hicule[s]?.{0,15}(maintenance|reparation|en.panne)",
     "SELECT v.immatriculation, v.type, v.kilometrage, m.type AS type_maintenance, m.date_prevue FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id WHERE m.effectuee=0 ORDER BY m.date_prevue",
     "Véhicules en maintenance :", "maintenance"),
    (r"v[eé]hicule[s]?.{0,15}actif[s]?",
     "SELECT immatriculation, type, capacite, kilometrage FROM vehicules WHERE statut='actif' ORDER BY immatriculation",
     "Véhicules actifs :", "liste"),
    (r"v[eé]hicule[s]?.{0,15}inactif[s]?",
     "SELECT immatriculation, type, kilometrage FROM vehicules WHERE statut='inactif'",
     "Véhicules inactifs :", "liste"),
    (r"(liste|tous|toutes?).{0,15}v[eé]hicule",
     "SELECT immatriculation, type, statut, capacite, kilometrage FROM vehicules ORDER BY statut, immatriculation",
     "Liste des véhicules :", "liste"),
    (r"v[eé]hicule.{0,15}(type|bus|minibus|express)",
     "SELECT type, COUNT(*) AS nb, SUM(CASE WHEN statut='actif' THEN 1 ELSE 0 END) AS actifs, ROUND(AVG(kilometrage),0) AS km_moyen FROM vehicules GROUP BY type",
     "Véhicules par type :", "statistique"),
    (r"kilom[eé]trage.{0,20}(total|flotte|parc|moyen)",
     "SELECT SUM(kilometrage) AS km_total_flotte, ROUND(AVG(kilometrage),0) AS km_moyen, MAX(kilometrage) AS km_max FROM vehicules WHERE statut='actif'",
     "Kilométrage de la flotte :", "statistique"),
    (r"v[eé]hicule.{0,20}capacit",
     "SELECT type, ROUND(AVG(capacite),0) AS capacite_moy, MAX(capacite) AS capacite_max, MIN(capacite) AS capacite_min, COUNT(*) AS nb FROM vehicules GROUP BY type",
     "Capacité par type de véhicule :", "statistique"),
    # == INCIDENTS ==
    (r"incident[s]?.{0,15}(non.r[eé]solu|en.cours|ouvert[s]?)",
     "SELECT type, gravite, COUNT(*) AS nb FROM incidents WHERE resolu=0 GROUP BY type, gravite ORDER BY CASE gravite WHEN 'grave' THEN 1 WHEN 'moyen' THEN 2 ELSE 3 END",
     "Incidents non résolus :", "statistique"),
    (r"incident[s]?.{0,15}grave[s]?",
     "SELECT type, COUNT(*) AS nb, SUM(CASE WHEN resolu=0 THEN 1 ELSE 0 END) AS ouverts FROM incidents WHERE gravite='grave' GROUP BY type ORDER BY nb DESC",
     "Incidents graves :", "statistique"),
    (r"incident[s]?.{0,15}(faible|moyen|l[eé]ger)",
     "SELECT gravite, type, COUNT(*) AS nb FROM incidents WHERE gravite IN ('faible','moyen') GROUP BY gravite, type ORDER BY gravite, nb DESC",
     "Incidents par gravité :", "statistique"),
    (r"(liste|tous|toutes?).{0,15}incident",
     "SELECT type, gravite, COUNT(*) AS nb, SUM(CASE WHEN resolu=0 THEN 1 ELSE 0 END) AS ouverts FROM incidents GROUP BY type, gravite ORDER BY CASE gravite WHEN 'grave' THEN 1 WHEN 'moyen' THEN 2 ELSE 3 END",
     "Incidents par type et gravité :", "statistique"),
    (r"incident.{0,25}(par.{0,5})?mois",
     "SELECT DATE_FORMAT(date_incident, '%Y-%m') AS mois, COUNT(*) AS nb, SUM(CASE WHEN gravite='grave' THEN 1 ELSE 0 END) AS graves FROM incidents GROUP BY mois ORDER BY mois DESC LIMIT 12",
     "Incidents par mois :", "statistique"),
    (r"incident.{0,25}(par.{0,5})?type",
     "SELECT type, COUNT(*) AS nb, SUM(CASE WHEN gravite='grave' THEN 1 ELSE 0 END) AS graves, SUM(CASE WHEN resolu=0 THEN 1 ELSE 0 END) AS ouverts FROM incidents GROUP BY type ORDER BY nb DESC",
     "Incidents par type :", "statistique"),
    (r"(panne|accident|retard).{0,25}(frequen|plus|souvent|commun)",
     "SELECT type, COUNT(*) AS nb, SUM(CASE WHEN resolu=0 THEN 1 ELSE 0 END) AS ouverts FROM incidents GROUP BY type ORDER BY nb DESC LIMIT 10",
     "Types d'incidents les plus fréquents :", "statistique"),
    (r"incident.{0,20}(r[eé]solu|ferm[eé]|clos)",
     "SELECT type, gravite, COUNT(*) AS nb FROM incidents WHERE resolu=1 GROUP BY type, gravite ORDER BY nb DESC",
     "Incidents résolus :", "statistique"),
    (r"taux.{0,20}(r[eé]solution|r[eé]solu).{0,20}incident",
     "SELECT COUNT(*) AS total, SUM(resolu) AS resolus, ROUND(SUM(resolu)*100.0/COUNT(*),1) AS taux_resolution_pct FROM incidents",
     "Taux de résolution des incidents :", "statistique"),
    # == MAINTENANCE ==
    (r"maintenance[s]?.{0,20}(non.effectu|en.attente|pr[eé]vue[s]?|programm)",
     "SELECT v.immatriculation, v.type, m.type AS maintenance, m.date_prevue, m.cout, DATEDIFF(m.date_prevue, CURDATE()) AS jours_restants FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id WHERE m.effectuee=0 ORDER BY m.date_prevue",
     "Maintenances en attente :", "maintenance"),
    (r"maintenance[s]?.{0,20}(effectu[eé]|termin[eé]|fait[s]?|pass[eé])",
     "SELECT v.immatriculation, m.type AS maintenance, m.date_prevue, m.cout FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id WHERE m.effectuee=1 ORDER BY m.date_prevue DESC LIMIT 20",
     "Maintenances effectuées :", "maintenance"),
    (r"(co[uû]t|montant|d[eé]pense).{0,20}maintenance",
     "SELECT DATE_FORMAT(date_prevue, '%Y-%m') AS mois, SUM(cout) AS total, COUNT(*) AS nb FROM maintenance GROUP BY mois ORDER BY mois DESC LIMIT 12",
     "Coûts de maintenance par mois :", "financier"),
    (r"co[uû]t.{0,20}(total|global).{0,20}maintenance|budget.{0,15}maintenance",
     "SELECT SUM(cout) AS cout_total, SUM(CASE WHEN effectuee=1 THEN cout ELSE 0 END) AS effectue, SUM(CASE WHEN effectuee=0 THEN cout ELSE 0 END) AS prevu FROM maintenance",
     "Coût total de maintenance :", "financier"),
    (r"prochaine.{0,20}maintenance",
     "SELECT v.immatriculation, v.type, m.type AS maintenance, m.date_prevue, DATEDIFF(m.date_prevue, CURDATE()) AS jours_restants FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id WHERE m.effectuee=0 AND date(m.date_prevue)>=CURDATE() ORDER BY m.date_prevue LIMIT 10",
     "Prochaines maintenances :", "maintenance"),
    (r"maintenance.{0,25}urgent|urgent.{0,25}maintenance",
     "SELECT v.immatriculation, v.type, m.type AS maintenance, m.date_prevue, DATEDIFF(m.date_prevue, CURDATE()) AS jours_restants FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id WHERE m.effectuee=0 AND date(m.date_prevue)<=DATE_ADD(CURDATE(), INTERVAL 7 DAY) ORDER BY m.date_prevue",
     "Maintenances urgentes (7 jours) :", "maintenance"),
    (r"(liste|toutes?|tous).{0,15}maintenance",
     "SELECT v.immatriculation, m.type, m.date_prevue, m.cout, CASE m.effectuee WHEN 1 THEN 'Effectuée' ELSE 'En attente' END AS statut FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id ORDER BY m.date_prevue DESC",
     "Toutes les maintenances :", "maintenance"),
    # == LIGNES ==
    (r"(liste|toutes?|tous).{0,15}ligne[s]?",
     "SELECT code, nom, origine, destination, distance_km FROM lignes ORDER BY code",
     "Liste des lignes :", "liste"),
    (r"(top|meilleure[s]?|plus.rentable).{0,15}ligne",
     "SELECT l.nom, l.code, SUM(t.recette) AS recette, COUNT(t.id) AS nb_trajets, SUM(t.nb_passagers) AS passagers FROM trajets t JOIN lignes l ON t.ligne_id=l.id WHERE t.statut='termine' GROUP BY l.id ORDER BY recette DESC LIMIT 10",
     "Top lignes par recette :", "financier"),
    (r"(classement|rang).{0,15}ligne",
     "SELECT l.nom, l.code, SUM(t.recette) AS recette, COUNT(t.id) AS nb_trajets FROM trajets t JOIN lignes l ON t.ligne_id=l.id WHERE t.statut='termine' GROUP BY l.id ORDER BY recette DESC LIMIT 10",
     "Classement des lignes :", "financier"),
    (r"ligne.{0,25}(plus.activ|plus.utilis|plus.trajet|plus.fr[eé]quent)",
     "SELECT l.nom, l.code, COUNT(t.id) AS nb_trajets, SUM(t.nb_passagers) AS passagers FROM trajets t JOIN lignes l ON t.ligne_id=l.id WHERE t.statut='termine' GROUP BY l.id ORDER BY nb_trajets DESC LIMIT 10",
     "Lignes les plus actives :", "statistique"),
    (r"trajet.{0,25}(par.{0,5})?ligne",
     "SELECT l.nom, l.code, COUNT(t.id) AS nb_trajets, SUM(t.recette) AS recette_totale FROM trajets t JOIN lignes l ON t.ligne_id=l.id WHERE t.statut='termine' GROUP BY l.id ORDER BY nb_trajets DESC",
     "Trajets par ligne :", "statistique"),
    (r"ligne.{0,20}(distance|km|longue|court|itin[eé]raire)",
     "SELECT nom, code, origine, destination, distance_km, duree_minutes FROM lignes ORDER BY distance_km DESC",
     "Lignes par distance :", "liste"),
    # == RECETTES / FINANCES ==
    (r"(revenu[s]?|recette[s]?).{0,25}(par.{0,5})?ligne",
     "SELECT l.nom, l.code, SUM(t.recette) AS recette_totale, COUNT(t.id) AS nb_trajets, SUM(t.nb_passagers) AS nb_passagers FROM trajets t JOIN lignes l ON t.ligne_id=l.id WHERE t.statut='termine' GROUP BY l.id ORDER BY recette_totale DESC",
     "Recettes par ligne :", "financier"),
    (r"recette[s]?.{0,25}(mois|mensuel|par.mois)",
     "SELECT DATE_FORMAT(date_heure_depart, '%Y-%m') AS mois, SUM(recette) AS recette_totale, COUNT(*) AS nb_trajets, SUM(nb_passagers) AS passagers FROM trajets WHERE statut='termine' GROUP BY mois ORDER BY mois DESC LIMIT 12",
     "Recettes par mois :", "financier"),
    (r"recette[s]?.{0,25}(semaine|hebdo)",
     "SELECT DATE_FORMAT(date_heure_depart, '%Y-%u') AS semaine, SUM(recette) AS recette_totale, COUNT(*) AS nb_trajets FROM trajets WHERE statut='termine' GROUP BY semaine ORDER BY semaine DESC LIMIT 8",
     "Recettes par semaine :", "financier"),
    (r"recette[s]?.{0,15}(aujourd|du.jour|journ[eé]e)",
     "SELECT SUM(recette) AS recette_jour, COUNT(*) AS nb_trajets FROM trajets WHERE statut='termine' AND date(date_heure_depart)=CURDATE()",
     "Recette du jour :", "financier"),
    (r"recette[s]?.{0,15}(total|global|cumul|tout)",
     "SELECT SUM(recette) AS recette_totale, COUNT(*) AS nb_trajets, SUM(nb_passagers) AS total_passagers FROM trajets WHERE statut='termine'",
     "Recette totale :", "financier"),
    (r"(chiffre.affaire|revenu.global)",
     "SELECT SUM(recette) AS chiffre_affaires, COUNT(*) AS nb_trajets, ROUND(AVG(recette),0) AS recette_moy_trajet FROM trajets WHERE statut='termine'",
     "Chiffre d'affaires :", "financier"),
    (r"recette.{0,15}(moyen|moy|par.trajet)",
     "SELECT ROUND(AVG(recette),0) AS recette_moy_trajet, MIN(recette) AS min, MAX(recette) AS max FROM trajets WHERE statut='termine'",
     "Recette moyenne par trajet :", "financier"),
    (r"passager[s]?.{0,25}(mois|mensuel|par.mois)",
     "SELECT DATE_FORMAT(date_heure_depart, '%Y-%m') AS mois, SUM(nb_passagers) AS nb_passagers, COUNT(*) AS nb_trajets FROM trajets WHERE statut='termine' GROUP BY mois ORDER BY mois DESC LIMIT 12",
     "Passagers par mois :", "statistique"),
    (r"passager.{0,20}(moyen|moy|par.trajet)",
     "SELECT ROUND(AVG(nb_passagers),1) AS moy_passagers_trajet, MAX(nb_passagers) AS max, MIN(nb_passagers) AS min FROM trajets WHERE statut='termine'",
     "Passagers moyens par trajet :", "statistique"),
    # == TRAJETS ==
    (r"trajet[s]?.{0,20}(aujourd|du.jour|journ[eé]e)",
     "SELECT t.date_heure_depart, l.nom AS ligne, CONCAT(c.prenom,' ',c.nom) AS chauffeur, t.statut, t.nb_passagers FROM trajets t JOIN lignes l ON t.ligne_id=l.id JOIN chauffeurs c ON t.chauffeur_id=c.id WHERE date(t.date_heure_depart)=CURDATE() ORDER BY t.date_heure_depart",
     "Trajets d'aujourd'hui :", "liste"),
    (r"trajet[s]?.{0,20}(en.cours|actif[s]?|actuel[s]?)",
     "SELECT t.date_heure_depart, l.nom AS ligne, CONCAT(c.prenom,' ',c.nom) AS chauffeur, v.immatriculation, t.nb_passagers FROM trajets t JOIN lignes l ON t.ligne_id=l.id JOIN chauffeurs c ON t.chauffeur_id=c.id JOIN vehicules v ON t.vehicule_id=v.id WHERE t.statut='en_cours' ORDER BY t.date_heure_depart",
     "Trajets en cours :", "liste"),
    (r"trajet[s]?.{0,20}(annul[eé]|annulation)",
     "SELECT t.date_heure_depart, l.nom AS ligne, CONCAT(c.prenom,' ',c.nom) AS chauffeur FROM trajets t JOIN lignes l ON t.ligne_id=l.id JOIN chauffeurs c ON t.chauffeur_id=c.id WHERE t.statut='annule' ORDER BY t.date_heure_depart DESC LIMIT 20",
     "Trajets annulés :", "liste"),
    (r"dernier[s]?.{0,10}trajet[s]?",
     "SELECT t.date_heure_depart, l.nom AS ligne, CONCAT(c.prenom,' ',c.nom) AS chauffeur, t.statut, t.nb_passagers, t.recette FROM trajets t JOIN lignes l ON t.ligne_id=l.id JOIN chauffeurs c ON t.chauffeur_id=c.id ORDER BY t.date_heure_depart DESC LIMIT 10",
     "Derniers trajets :", "liste"),
    # == TABLEAU DE BORD ==
    (r"(stat|r[eé]sum[eé]|tableau.de.bord|bilan|performance|analyse|rapport|activit[eé]|situation|vue.ens|r[eé]capitulatif|synth[eè]se|overview|flotte|global|g[eé]n[eé]ral|kpi)",
     "SELECT (SELECT COUNT(*) FROM vehicules WHERE statut='actif') AS vehicules_actifs, (SELECT COUNT(*) FROM vehicules) AS total_vehicules, (SELECT COUNT(*) FROM chauffeurs WHERE disponibilite=1) AS chauffeurs_disponibles, (SELECT COUNT(*) FROM incidents WHERE resolu=0) AS incidents_ouverts, (SELECT COUNT(*) FROM incidents WHERE gravite='grave' AND resolu=0) AS incidents_graves, (SELECT COALESCE(SUM(recette),0) FROM trajets WHERE statut='termine' AND date(date_heure_depart)=CURDATE()) AS recette_jour, (SELECT COUNT(*) FROM trajets WHERE date(date_heure_depart)=CURDATE()) AS trajets_aujourd_hui, (SELECT COUNT(*) FROM maintenance WHERE effectuee=0) AS maintenances_en_attente",
     "Tableau de bord :", "statistique"),
    # == PLANNING ==
    (r"planning.{0,25}(demain|lendemain)",
     "SELECT p.date_heure_depart_prevue, l.nom AS ligne, CONCAT(c.prenom,' ',c.nom) AS chauffeur, v.immatriculation, p.statut FROM plannings p JOIN lignes l ON p.ligne_id=l.id JOIN chauffeurs c ON p.chauffeur_id=c.id JOIN vehicules v ON p.vehicule_id=v.id WHERE date(p.date_heure_depart_prevue)=DATE_ADD(CURDATE(), INTERVAL 1 DAY) ORDER BY p.date_heure_depart_prevue",
     "Planning de demain :", "planning"),
    (r"planning.{0,25}(semaine|7.jour|hebdo)",
     "SELECT p.date_heure_depart_prevue, l.nom AS ligne, CONCAT(c.prenom,' ',c.nom) AS chauffeur, p.statut FROM plannings p JOIN lignes l ON p.ligne_id=l.id JOIN chauffeurs c ON p.chauffeur_id=c.id WHERE date(p.date_heure_depart_prevue) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) ORDER BY p.date_heure_depart_prevue",
     "Planning de la semaine :", "planning"),
    (r"planning",
     "SELECT p.date_heure_depart_prevue, l.nom AS ligne, CONCAT(c.prenom,' ',c.nom) AS chauffeur, v.immatriculation, p.statut FROM plannings p JOIN lignes l ON p.ligne_id=l.id JOIN chauffeurs c ON p.chauffeur_id=c.id JOIN vehicules v ON p.vehicule_id=v.id WHERE date(p.date_heure_depart_prevue)=CURDATE() ORDER BY p.date_heure_depart_prevue",
     "Planning du jour :", "planning"),
    # == TARIFS ==
    (r"tarif[s]?.{0,10}[eé]tudiant",
     "SELECT l.nom, tf.prix FROM tarifs tf JOIN lignes l ON tf.ligne_id=l.id WHERE tf.type_client='etudiant' AND CURDATE() BETWEEN tf.date_debut AND tf.date_fin ORDER BY l.nom",
     "Tarifs étudiants :", "liste"),
    (r"tarif[s]?.{0,10}normal",
     "SELECT l.nom, tf.prix FROM tarifs tf JOIN lignes l ON tf.ligne_id=l.id WHERE tf.type_client='normal' AND CURDATE() BETWEEN tf.date_debut AND tf.date_fin ORDER BY l.nom",
     "Tarifs normaux :", "liste"),
    (r"(diff[eé]rence|compar).{0,20}(tarif|prix)",
     "SELECT l.nom, MAX(CASE WHEN tf.type_client='normal' THEN tf.prix END) AS tarif_normal, MAX(CASE WHEN tf.type_client='etudiant' THEN tf.prix END) AS tarif_etudiant FROM tarifs tf JOIN lignes l ON tf.ligne_id=l.id GROUP BY l.id ORDER BY l.nom",
     "Comparaison des tarifs :", "liste"),
    (r"tarif|prix.{0,15}(billet|ticket|voyage|transport)",
     "SELECT l.nom, tf.type_client, tf.prix FROM tarifs tf JOIN lignes l ON tf.ligne_id=l.id WHERE CURDATE() BETWEEN tf.date_debut AND tf.date_fin ORDER BY l.nom, tf.type_client",
     "Tous les tarifs :", "liste"),
]


def try_shortcut(question: str) -> dict | None:
    """Retourne {sql, answer, intent} si la question correspond à un raccourci, sinon None."""
    q = _expand_question(question)  # normalise accents + alias avant matching
    for pattern, sql, answer, intent in _SHORTCUTS:
        if re.search(pattern, q):
            return {"sql": sql, "answer": answer, "intent": intent}
    return None


# ─────────────────────────────────────────────
# SMART FALLBACK  (NLU sans LLM — couvre ~95 % des questions DB)
# ─────────────────────────────────────────────
def smart_fallback(question: str) -> dict | None:
    """
    Génère du SQL sans LLM en détectant l'entité principale et l'intention.
    Appelé quand aucun raccourci exact ne correspond.
    """
    q = _expand_question(question)  # normalise accents + alias

    # ── Entité principale ──────────────────────────────────────────────────
    entity = None
    for ent, pats in [
        ("chauffeur",    [r"chauffeur"]),
        ("vehicule",     [r"v[eé]hicule", r"\bautobus\b", r"\bbus\b"]),
        ("incident",     [r"\bincident"]),
        ("trajet",       [r"\btrajet"]),
        ("ligne",        [r"\bligne"]),
        ("maintenance",  [r"maintenance", r"r[eé]paration", r"entretien"]),
        ("tarif",        [r"tarif", r"\bprix\b"]),
        ("planning",     [r"planning", r"programme"]),
        ("recette",      [r"recette", r"revenu", r"chiffre.affaire", r"financ"]),
        ("passager",     [r"passager"]),
    ]:
        if any(re.search(p, q) for p in pats):
            entity = ent
            break

    if not entity:
        return None

    # ── Filtres de statut / gravité ────────────────────────────────────────
    where: list[str] = []
    if entity == "chauffeur":
        if re.search(r"dispon", q):     where.append("disponibilite=1")
        if re.search(r"indispon", q):   where.append("disponibilite=0")
    if entity == "vehicule":
        if re.search(r"\bactif", q):            where.append("statut='actif'")
        if re.search(r"inactif|hors.service", q): where.append("statut='inactif'")
        if re.search(r"en.maintenance", q):     where.append("statut='maintenance'")
    if entity == "incident":
        if re.search(r"\bgrave", q):            where.append("gravite='grave'")
        if re.search(r"\bmoyen", q):            where.append("gravite='moyen'")
        if re.search(r"non.r[eé]solu|ouvert",q): where.append("resolu=0")
        if re.search(r"\br[eé]solu", q):        where.append("resolu=1")
    if entity == "trajet":
        if re.search(r"termin", q):   where.append("statut='termine'")
        if re.search(r"annul", q):    where.append("statut='annule'")
        if re.search(r"planifi", q):  where.append("statut='planifie'")
        if re.search(r"en.cours", q): where.append("statut='en_cours'")
    if entity == "maintenance":
        if re.search(r"non.effectu|en.attente", q): where.append("effectuee=0")
        if re.search(r"effectu[eé]", q):            where.append("effectuee=1")
    if entity == "tarif":
        if re.search(r"[eé]tudiant", q): where.append("tf.type_client='etudiant'")
        if re.search(r"normal", q):      where.append("tf.type_client='normal'")

    # ── Filtres de date ────────────────────────────────────────────────────
    date_col = {
        "trajet":      "date_heure_depart",
        "incident":    "date_incident",
        "maintenance": "date_prevue",
        "planning":    "date_heure_depart_prevue",
    }.get(entity)
    if date_col:
        if re.search(r"aujourd", q):
            where.append(f"date({date_col})=CURDATE()")
        elif re.search(r"\bhier\b", q):
            where.append(f"date({date_col})=DATE_SUB(CURDATE(), INTERVAL 1 DAY)")
        elif re.search(r"cette.semaine|7.jours", q):
            where.append(f"date({date_col})>=DATE_SUB(CURDATE(), INTERVAL 7 DAY)")
        elif re.search(r"ce.mois", q):
            where.append(f"DATE_FORMAT({date_col}, '%Y-%m')=DATE_FORMAT(CURDATE(), '%Y-%m')")
        elif re.search(r"30.jours|dernier.mois", q):
            where.append(f"date({date_col})>=DATE_SUB(CURDATE(), INTERVAL 30 DAY)")

    wstr = ("WHERE " + " AND ".join(where)) if where else ""

    # ── Détection intention ────────────────────────────────────────────────
    m = re.search(r"top.{0,3}(\d+)|(\d+).premier", q)
    lim = int(m.group(1) or m.group(2)) if m else 10
    is_count = bool(re.search(r"combien|nombre|count", q))
    is_top   = bool(re.search(r"top|meilleur|plus.grand|plus.nombreux|classement", q))
    is_sum   = bool(re.search(r"somme|total.recette|recette.total", q))
    is_avg   = bool(re.search(r"moyen|moyenne", q))

    # ── SQL par entité ─────────────────────────────────────────────────────
    sql, answer, intent = None, None, "statistique"

    if entity == "chauffeur":
        if is_count:
            sql = "SELECT disponibilite, COUNT(*) AS nb FROM chauffeurs GROUP BY disponibilite"
            answer = "Répartition des chauffeurs :"
        elif is_top or re.search(r"recette|performance", q):
            sql = f"SELECT CONCAT(c.prenom, ' ', c.nom) AS chauffeur, COUNT(t.id) AS nb_trajets, COALESCE(SUM(t.recette),0) AS recette FROM chauffeurs c LEFT JOIN trajets t ON t.chauffeur_id=c.id AND t.statut='termine' GROUP BY c.id ORDER BY nb_trajets DESC LIMIT {lim}"
            answer = "Classement des chauffeurs :"
        else:
            sql = f"SELECT nom, prenom, telephone, disponibilite FROM chauffeurs {wstr} ORDER BY nom"
            answer = "Liste des chauffeurs :"
        intent = "liste"

    elif entity == "vehicule":
        if is_count:
            sql = "SELECT statut, COUNT(*) AS nb FROM vehicules GROUP BY statut"
            answer = "Répartition des véhicules :"
        elif is_top or re.search(r"km|kilom", q):
            order = "ASC" if re.search(r"moins|min", q) else "DESC"
            sql = f"SELECT immatriculation, type, statut, kilometrage FROM vehicules ORDER BY kilometrage {order} LIMIT {lim}"
            answer = "Véhicules par kilométrage :"
        else:
            sql = f"SELECT immatriculation, type, statut, capacite, kilometrage FROM vehicules {wstr} ORDER BY statut, immatriculation"
            answer = "Liste des véhicules :"
        intent = "liste"

    elif entity == "incident":
        if is_count:
            sql = "SELECT gravite, COUNT(*) AS total, SUM(CASE WHEN resolu=0 THEN 1 ELSE 0 END) AS ouverts FROM incidents GROUP BY gravite"
            answer = "Incidents par gravité :"
        elif re.search(r"par.mois|mensuel", q):
            sql = "SELECT DATE_FORMAT(date_incident, '%Y-%m') AS mois, COUNT(*) AS nb, SUM(CASE WHEN gravite='grave' THEN 1 ELSE 0 END) AS graves FROM incidents GROUP BY mois ORDER BY mois DESC LIMIT 12"
            answer = "Incidents par mois :"
        elif re.search(r"type", q):
            sql = "SELECT type, COUNT(*) AS nb FROM incidents GROUP BY type ORDER BY nb DESC"
            answer = "Incidents par type :"
        else:
            sql = f"SELECT type, gravite, description, resolu FROM incidents {wstr} ORDER BY CASE gravite WHEN 'grave' THEN 1 WHEN 'moyen' THEN 2 ELSE 3 END"
            answer = "Liste des incidents :"
        intent = "incident"

    elif entity == "trajet":
        if is_count:
            sql = "SELECT statut, COUNT(*) AS nb FROM trajets GROUP BY statut"
            answer = "Trajets par statut :"
        elif is_sum or re.search(r"recette", q):
            sql = "SELECT DATE_FORMAT(date_heure_depart, '%Y-%m') AS mois, SUM(recette) AS total, COUNT(*) AS nb FROM trajets WHERE statut='termine' GROUP BY mois ORDER BY mois DESC LIMIT 6"
            answer = "Recettes par mois :"
            intent = "financier"
        elif is_top:
            sql = f"SELECT l.nom AS ligne, COUNT(t.id) AS nb_trajets, SUM(t.recette) AS recette FROM trajets t JOIN lignes l ON t.ligne_id=l.id WHERE t.statut='termine' GROUP BY l.id ORDER BY nb_trajets DESC LIMIT {lim}"
            answer = "Lignes les plus actives :"
        else:
            sql = f"SELECT t.date_heure_depart, l.nom AS ligne, CONCAT(c.prenom, ' ', c.nom) AS chauffeur, t.statut, t.nb_passagers FROM trajets t JOIN lignes l ON t.ligne_id=l.id JOIN chauffeurs c ON t.chauffeur_id=c.id {wstr} ORDER BY t.date_heure_depart DESC LIMIT {lim}"
            answer = "Liste des trajets :"
        intent = intent if intent == "financier" else "liste"

    elif entity == "ligne":
        if is_count:
            sql = "SELECT COUNT(*) AS total FROM lignes"
            answer = "Nombre de lignes :"
        elif is_top or re.search(r"recette|rentable|performance", q):
            sql = f"SELECT l.nom, l.code, COALESCE(SUM(t.recette),0) AS recette_totale, COUNT(t.id) AS nb_trajets FROM lignes l LEFT JOIN trajets t ON t.ligne_id=l.id AND t.statut='termine' GROUP BY l.id ORDER BY recette_totale DESC LIMIT {lim}"
            answer = "Lignes par recette :"
            intent = "financier"
        else:
            sql = "SELECT code, nom, origine, destination FROM lignes ORDER BY code"
            answer = "Liste des lignes :"
            intent = "liste"

    elif entity == "maintenance":
        if is_count or is_sum:
            sql = "SELECT effectuee, COUNT(*) AS nb, SUM(cout) AS cout_total FROM maintenance GROUP BY effectuee"
            answer = "Maintenances par statut :"
        elif re.search(r"co[uû]t|montant", q):
            sql = "SELECT DATE_FORMAT(date_prevue, '%Y-%m') AS mois, SUM(cout) AS total, COUNT(*) AS nb FROM maintenance GROUP BY mois ORDER BY mois DESC LIMIT 6"
            answer = "Coûts de maintenance par mois :"
            intent = "financier"
        elif re.search(r"urgent|bient[oô]t|prochain", q):
            sql = "SELECT v.immatriculation, m.type, m.date_prevue, m.cout, DATEDIFF(m.date_prevue, CURDATE()) AS jours_restants FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id WHERE m.effectuee=0 AND m.date_prevue<=DATE_ADD(CURDATE(), INTERVAL 14 DAY) ORDER BY m.date_prevue"
            answer = "Maintenances urgentes :"
        else:
            sql = f"SELECT v.immatriculation, m.type, m.date_prevue, m.cout, m.effectuee FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id {wstr} ORDER BY m.date_prevue"
            answer = "Liste des maintenances :"
        intent = "maintenance"

    elif entity == "tarif":
        wstr_tarif = ("WHERE " + " AND ".join(where + ["CURDATE() BETWEEN tf.date_debut AND tf.date_fin"])) if where else "WHERE CURDATE() BETWEEN tf.date_debut AND tf.date_fin"
        sql = f"SELECT l.nom, tf.type_client, tf.prix FROM tarifs tf JOIN lignes l ON tf.ligne_id=l.id {wstr_tarif} ORDER BY l.nom, tf.type_client"
        answer = "Tarifs en vigueur :"
        intent = "liste"

    elif entity == "planning":
        if re.search(r"demain", q):
            sql = "SELECT p.date_heure_depart_prevue, l.nom AS ligne, CONCAT(c.prenom, ' ', c.nom) AS chauffeur, v.immatriculation FROM plannings p JOIN lignes l ON p.ligne_id=l.id JOIN chauffeurs c ON p.chauffeur_id=c.id JOIN vehicules v ON p.vehicule_id=v.id WHERE date(p.date_heure_depart_prevue)=DATE_ADD(CURDATE(), INTERVAL 1 DAY) ORDER BY p.date_heure_depart_prevue"
            answer = "Planning de demain :"
        elif re.search(r"semaine", q):
            sql = "SELECT p.date_heure_depart_prevue, l.nom AS ligne, CONCAT(c.prenom, ' ', c.nom) AS chauffeur, p.statut FROM plannings p JOIN lignes l ON p.ligne_id=l.id JOIN chauffeurs c ON p.chauffeur_id=c.id WHERE date(p.date_heure_depart_prevue) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) ORDER BY p.date_heure_depart_prevue"
            answer = "Planning de la semaine :"
        else:
            sql = "SELECT p.date_heure_depart_prevue, l.nom AS ligne, CONCAT(c.prenom, ' ', c.nom) AS chauffeur, v.immatriculation, p.statut FROM plannings p JOIN lignes l ON p.ligne_id=l.id JOIN chauffeurs c ON p.chauffeur_id=c.id JOIN vehicules v ON p.vehicule_id=v.id WHERE date(p.date_heure_depart_prevue)=CURDATE() ORDER BY p.date_heure_depart_prevue"
            answer = "Planning du jour :"
        intent = "liste"

    elif entity in ("recette", "passager"):
        if re.search(r"ligne", q):
            sql = "SELECT l.nom, l.code, SUM(t.recette) AS recette, SUM(t.nb_passagers) AS passagers FROM trajets t JOIN lignes l ON t.ligne_id=l.id WHERE t.statut='termine' GROUP BY l.id ORDER BY recette DESC"
            answer = "Recettes et passagers par ligne :"
        elif re.search(r"chauffeur", q):
            sql = f"SELECT CONCAT(c.prenom, ' ', c.nom) AS chauffeur, SUM(t.recette) AS recette, SUM(t.nb_passagers) AS passagers FROM trajets t JOIN chauffeurs c ON t.chauffeur_id=c.id WHERE t.statut='termine' GROUP BY c.id ORDER BY recette DESC LIMIT {lim}"
            answer = "Recettes par chauffeur :"
        elif re.search(r"jour", q):
            sql = "SELECT SUM(recette) AS recette_jour, SUM(nb_passagers) AS passagers_jour FROM trajets WHERE statut='termine' AND date(date_heure_depart)=CURDATE()"
            answer = "Recettes du jour :"
        elif re.search(r"semaine", q):
            sql = "SELECT SUM(recette) AS recette_semaine, SUM(nb_passagers) AS passagers_semaine FROM trajets WHERE statut='termine' AND date(date_heure_depart)>=DATE_SUB(CURDATE(), INTERVAL 7 DAY)"
            answer = "Recettes de la semaine :"
        else:
            sql = "SELECT DATE_FORMAT(date_heure_depart, '%Y-%m') AS mois, SUM(recette) AS recette_totale, SUM(nb_passagers) AS total_passagers FROM trajets WHERE statut='termine' GROUP BY mois ORDER BY mois DESC LIMIT 12"
            answer = "Recettes et passagers par mois :"
        intent = "financier"

    if sql is None:
        return None
    return {"sql": sql, "answer": answer, "intent": intent}


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
        opts.setdefault("num_ctx", 512)
        opts.setdefault("num_predict", 120)
        opts.setdefault("num_batch", 512)
        require_json = opts.pop("require_json", False)
        if opts:
            payload["options"] = opts
        if require_json:
            payload["format"] = "json"
    else:
        # Groq / OpenAI-compatible
        require_json = (options or {}).pop("require_json", False) if options else False
        if options and "num_predict" in options:
            payload["max_tokens"] = options["num_predict"]
        else:
            payload["max_tokens"] = 300
        if require_json:
            payload["response_format"] = {"type": "json_object"}

    client = get_http_client()
    resp = await client.post(url, json=payload, headers=headers)

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
                "Tu es un expert SQL MySQL/MariaDB. Corrige la requête SQL ci-dessous qui a produit une erreur. "
                "Syntaxe MySQL : CONCAT(a,' ',b) pour concat, DATE_FORMAT(col,'%Y-%m') pour mois, "
                "CURDATE() pour aujourd'hui, TIMESTAMPDIFF(YEAR,col,CURDATE()) pour ancienneté. "
                "Retourne UNIQUEMENT la requête SQL corrigée, sans explication, sans markdown."
            )
        },
        {
            "role": "user",
            "content": (
                f"Question originale : {question}\n"
                f"Requête SQL fautive :\n{original_sql}\n"
                f"Erreur MySQL :\n{error_msg}\n\n"
                "Génère une requête MySQL/MariaDB corrigée qui répond à la question :"
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
# SYNTHÈSE LANGAGE NATUREL  (réponses en français conversationnel)
# ─────────────────────────────────────────────

# Mapping valeurs booléennes/enum → libellés français
_BOOL_LABELS = {
    "disponibilite": {1: "disponible", 0: "indisponible", True: "disponible", False: "indisponible"},
    "resolu":        {1: "résolu",     0: "non résolu",   True: "résolu",     False: "non résolu"},
    "effectuee":     {1: "effectuée",  0: "en attente",   True: "effectuée",  False: "en attente"},
}
_ENUM_LABELS = {
    "statut": {
        "actif": "actif", "inactif": "inactif", "maintenance": "en maintenance",
        "termine": "terminé", "en_cours": "en cours", "annule": "annulé",
        "planifie": "planifié", "effectue": "effectué", "programme": "programmé",
    },
    "gravite":      {"grave": "grave", "moyen": "moyen", "faible": "faible"},
    "type_client":  {"normal": "normal", "etudiant": "étudiant"},
}

def _humanize_cat(col: str, val) -> str:
    """Convertit une valeur de catégorie en libellé lisible."""
    col_l = col.lower()
    if col_l in _BOOL_LABELS:
        return _BOOL_LABELS[col_l].get(val, str(val))
    if col_l in _ENUM_LABELS:
        return _ENUM_LABELS[col_l].get(str(val), str(val))
    return str(val)

def _fmt_val(key: str, val) -> str:
    """Formate une valeur avec son unité contextuelle."""
    if val is None:
        return "—"
    k = key.lower()
    if isinstance(val, float):
        if any(x in k for x in ("recette", "cout", "prix", "revenu", "montant", "total", "cumul")):
            return f"{val:,.0f} FCFA"
        if any(x in k for x in ("taux", "pct", "pourcent")):
            return f"{val:.1f} %"
        return f"{val:,.1f}"
    if isinstance(val, int):
        if any(x in k for x in ("recette", "cout", "prix", "revenu", "montant")):
            return f"{val:,} FCFA"
        if any(x in k for x in ("trajet", "voyage")):   return f"{val} trajet{'s' if val > 1 else ''}"
        if any(x in k for x in ("incident",)):           return f"{val} incident{'s' if val > 1 else ''}"
        if any(x in k for x in ("passager",)):           return f"{val} passager{'s' if val > 1 else ''}"
        if any(x in k for x in ("km", "kilom")):         return f"{val:,} km"
        if any(x in k for x in ("jour",)):               return f"{val} jour{'s' if val > 1 else ''}"
        if any(x in k for x in ("maintenance",)):        return f"{val} maintenance{'s' if val > 1 else ''}"
        if any(x in k for x in ("ligne",)):              return f"{val} ligne{'s' if val > 1 else ''}"
        if any(x in k for x in ("chauffeur",)):          return f"{val} chauffeur{'s' if val > 1 else ''}"
        if any(x in k for x in ("vehicule", "véhicule")): return f"{val} véhicule{'s' if val > 1 else ''}"
        return f"{val:,}"
    return str(val)


def synthesize_answer_fast(label: str, data: list, intent: str) -> str:
    """Génère une réponse en français naturel à partir des données SQL."""
    if not data:
        return "Aucun résultat trouvé dans la base de données pour cette requête."

    n    = len(data)
    cols = list(data[0].keys())
    row0 = data[0]
    _bool_keys = {"resolu", "disponibilite", "effectuee"}
    _skip = {"id", "resolu", "disponibilite", "effectuee"}

    # ── 1. Valeur(s) unique(s) : COUNT / SUM / résultat chiffré ───────────
    if n == 1:
        # Cas tableau de bord multi-KPI
        _kpi_labels = {
            "vehicules_actifs":       "🚌 véhicules actifs",
            "total_vehicules":        "véhicules au total",
            "chauffeurs_disponibles": "👤 chauffeurs disponibles",
            "chauffeurs_dispo":       "👤 chauffeurs disponibles",
            "incidents_ouverts":      "⚠️ incidents ouverts",
            "incidents_graves":       "dont graves",
            "recette_jour":           "💰 recette du jour",
            "trajets_aujourd_hui":    "🛣️ trajets aujourd'hui",
            "maintenances_en_attente":"🔧 maintenances en attente",
        }
        if any(k in _kpi_labels for k in row0):
            parts = []
            for k, v in row0.items():
                if v is not None:
                    nice = _kpi_labels.get(k, k.replace("_", " "))
                    parts.append(f"**{_fmt_val(k, v)}** {nice}")
            intro = "Voici un résumé du tableau de bord :"
            return f"{intro}\n" + " · ".join(parts)

        # Cas 1 résultat avec colonnes numériques seulement → phrase naturelle
        num_items = [(k, v) for k, v in row0.items()
                     if isinstance(v, (int, float)) and k.lower() not in _bool_keys]
        text_items = [(k, v) for k, v in row0.items() if isinstance(v, str) and v]

        if len(cols) <= 3 and num_items and not text_items:
            # Ex: {total: 6} ou {chauffeurs_disponibles: 4, chauffeurs_indisponibles: 2}
            sentences = []
            for k, v in num_items:
                kl = k.lower()
                fv = _fmt_val(k, v)
                if any(x in kl for x in ("total", "nb", "nombre", "count")):
                    sentences.append(f"Il y a **{fv}** au total.")
                elif any(x in kl for x in ("chauffeur",)):
                    sentences.append(f"Il y a **{fv}** chauffeur{'s' if v and v > 1 else ''}.")
                elif any(x in kl for x in ("vehicule", "vehicle")):
                    sentences.append(f"Il y a **{fv}** véhicule{'s' if v and v > 1 else ''}.")
                elif any(x in kl for x in ("incident",)):
                    sentences.append(f"Il y a **{fv}** incident{'s' if v and v > 1 else ''}.")
                elif any(x in kl for x in ("trajet",)):
                    sentences.append(f"Il y a **{fv}** trajet{'s' if v and v > 1 else ''}.")
                elif any(x in kl for x in ("recette", "revenu", "chiffre")):
                    sentences.append(f"La recette s'élève à **{fv}**.")
                elif any(x in kl for x in ("cout", "budget", "depense")):
                    sentences.append(f"Le coût total est de **{fv}**.")
                elif any(x in kl for x in ("taux", "pct", "pourcent")):
                    sentences.append(f"Le taux est de **{fv}**.")
                elif any(x in kl for x in ("moy", "moyen", "average")):
                    sentences.append(f"La moyenne est de **{fv}**.")
                elif any(x in kl for x in ("passager", "voyageur")):
                    sentences.append(f"Il y a **{fv}** passager{'s' if v and v > 1 else ''}.")
                elif any(x in kl for x in ("maintenance",)):
                    sentences.append(f"Il y a **{fv}** maintenance{'s' if v and v > 1 else ''}.")
                elif any(x in kl for x in ("ligne",)):
                    sentences.append(f"Il y a **{fv}** ligne{'s' if v and v > 1 else ''}.")
                else:
                    sentences.append(f"Le résultat est **{fv}**.")
            return " ".join(sentences) if sentences else f"Le résultat est **{_fmt_val(num_items[0][0], num_items[0][1])}**."

        # 1 résultat avec texte + chiffres (ex: recette d'une ligne spécifique)
        if text_items and num_items:
            intro = ", ".join(f"**{v}**" for _, v in text_items[:2])
            detail_parts = []
            for k, v in num_items[:4]:
                kl = k.lower()
                fv = _fmt_val(k, v)
                if any(x in kl for x in ("recette", "revenu")):
                    detail_parts.append(f"une recette de **{fv}**")
                elif any(x in kl for x in ("trajet", "nb", "nombre")):
                    detail_parts.append(f"**{fv}** trajet{'s' if v and v > 1 else ''}")
                elif any(x in kl for x in ("passager", "voyageur")):
                    detail_parts.append(f"**{fv}** passager{'s' if v and v > 1 else ''}")
                elif any(x in kl for x in ("distance", "km")):
                    detail_parts.append(f"**{fv}** km")
                else:
                    detail_parts.append(f"**{fv}** {k.replace('_', ' ')}")
            return f"{intro} : " + ", ".join(detail_parts) + "."

    # ── 2. Distribution (GROUP BY boolean/enum : catégorie + nb) ───────────
    cat_col = cols[0]
    cnt_col = cols[1] if len(cols) >= 2 else None

    is_distribution = (
        n <= 8
        and len(cols) == 2
        and cnt_col
        and all(isinstance(row.get(cnt_col), (int, float)) for row in data)
        and (cat_col.lower() in _bool_keys
             or cat_col.lower() in _ENUM_LABELS
             or cat_col.lower() in {"statut", "gravite", "type", "type_client"})
    )

    if is_distribution:
        total = sum(row[cnt_col] for row in data)
        parts = []
        for row in data:
            cat_label = _humanize_cat(cat_col, row[cat_col])
            cnt = row[cnt_col]
            parts.append(f"**{cnt}** {cat_label}{'s' if cnt > 1 and not cat_label.endswith('s') else ''}")
        total_word = "au total"
        entity = "éléments"
        ll = label.lower()
        if "chauffeur" in ll:  entity = "chauffeurs"
        elif "véhicule" in ll or "vehicule" in ll: entity = "véhicules"
        elif "incident" in ll: entity = "incidents"
        elif "trajet" in ll:   entity = "trajets"
        elif "maintenance" in ll: entity = "maintenances"

        if len(parts) == 1:
            return f"{label}\nIl y a **{total} {entity}** {total_word} : {parts[0]}."
        elif len(parts) == 2:
            return f"{label}\nIl y a **{total} {entity}** {total_word} : {parts[0]} et {parts[1]}."
        else:
            last = parts[-1]
            rest = ", ".join(parts[:-1])
            return f"{label}\nIl y a **{total} {entity}** {total_word} : {rest} et {last}."

    # ── 3. Classement (1ère colonne texte, reste numériques signifiants) ────
    first_col = cols[0]
    num_cols = [
        c for c in cols[1:]
        if isinstance(row0.get(c), (int, float))
        and c.lower() not in _bool_keys
        and max((row.get(c, 0) or 0) for row in data) > 1
    ]
    is_ranking = isinstance(row0.get(first_col), str) and bool(num_cols) and n > 1

    if is_ranking:
        sort_col = num_cols[0]
        if any("recette" in c for c in num_cols):     sort_col = next(c for c in num_cols if "recette" in c)
        elif any("trajet" in c for c in num_cols):    sort_col = next(c for c in num_cols if "trajet" in c)
        elif any("incident" in c for c in num_cols):  sort_col = next(c for c in num_cols if "incident" in c)
        elif any("passager" in c for c in num_cols):  sort_col = next(c for c in num_cols if "passager" in c)

        critere = {
            **{c: "nombre de trajets"  for c in num_cols if "trajet"   in c},
            **{c: "recettes générées"  for c in num_cols if "recette"  in c},
            **{c: "incidents"          for c in num_cols if "incident" in c},
            **{c: "passagers"          for c in num_cols if "passager" in c},
            **{c: "kilométrage"        for c in num_cols if "km" in c or "kilom" in c},
        }.get(sort_col, sort_col.replace("_", " "))

        medals = ["🥇", "🥈", "🥉"] + [f"{i+1}." for i in range(3, 10)]
        lines = [f"Voici le classement par **{critere}** ({n} résultat{'s' if n > 1 else ''}) :"]
        for i, row in enumerate(data[:10]):
            name    = str(row[first_col])
            details = " · ".join(_fmt_val(c, row[c]) for c in num_cols if row.get(c) is not None)
            lines.append(f"{medals[i]} **{name}** — {details}")
        if n > 10:
            lines.append(f"_... {n - 10} autres dans le tableau._")
        return "\n".join(lines)

    # ── 4. Résultat unique avec plusieurs colonnes (ex: fiche chauffeur/véhicule)
    if n == 1:
        sentences = []
        for k, v in row0.items():
            if v is None or k.lower() in {"id"}:
                continue
            kl = k.lower()
            fv = _fmt_val(k, v)
            if kl in _bool_keys:
                hv = _humanize_cat(k, v)
                sentences.append(f"**{hv.capitalize()}**.")
            elif kl in _ENUM_LABELS:
                hv = _humanize_cat(k, v)
                sentences.append(f"Statut : **{hv}**.")
            elif any(x in kl for x in ("nom", "prenom", "name")):
                sentences.append(f"Nom : **{fv}**.")
            elif any(x in kl for x in ("recette", "revenu")):
                sentences.append(f"Recette : **{fv}**.")
            elif any(x in kl for x in ("date",)):
                sentences.append(f"Date : **{fv}**.")
            elif any(x in kl for x in ("immat",)):
                sentences.append(f"Immatriculation : **{fv}**.")
            elif any(x in kl for x in ("trajet", "nb", "nombre", "count")):
                sentences.append(f"Nombre de trajets : **{fv}**.")
            elif any(x in kl for x in ("passager", "voyageur")):
                sentences.append(f"Passagers : **{fv}**.")
            else:
                sentences.append(f"{k.replace('_', ' ').capitalize()} : **{fv}**.")
        intro = f"{label}\n" if label else ""
        return intro + " ".join(sentences) if sentences else f"{label}\nAucune information disponible."

    # ── 5. Liste générale ──────────────────────────────────────────────────
    ll = label.lower()
    if   "chauffeur"    in ll: noun = "chauffeur" + ("s" if n > 1 else "")
    elif "véhicule"     in ll or "vehicule" in ll: noun = "véhicule" + ("s" if n > 1 else "")
    elif "incident"     in ll: noun = "incident" + ("s" if n > 1 else "")
    elif "trajet"       in ll: noun = "trajet" + ("s" if n > 1 else "")
    elif "ligne"        in ll: noun = "ligne" + ("s" if n > 1 else "")
    elif "maintenance"  in ll: noun = "maintenance" + ("s" if n > 1 else "")
    elif "tarif"        in ll: noun = "tarif" + ("s" if n > 1 else "")
    elif "recette"      in ll: noun = "entrée" + ("s" if n > 1 else "")
    else:                       noun = "résultat" + ("s" if n > 1 else "")

    display_cols = [c for c in cols if c.lower() not in _skip][:5]
    intro = f"J'ai trouvé **{n} {noun}**" + (" dans la base de données :" if n > 1 else " :")
    lines = [intro]
    for row in data[:12]:
        parts = []
        for c in display_cols:
            v = row.get(c)
            if v is not None and str(v).strip() and str(v) not in ("None", ""):
                if c.lower() in _bool_keys:
                    parts.append(_humanize_cat(c, v))
                elif c.lower() in _ENUM_LABELS:
                    parts.append(_humanize_cat(c, v))
                else:
                    parts.append(_fmt_val(c, v))
        if parts:
            lines.append("• " + " — ".join(parts))
    if n > 12:
        lines.append(f"_... {n - 12} autres résultats dans le tableau._")
    return "\n".join(lines)


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
        question  = req.question.strip()
        q_lower   = question.lower()
        q_expanded = _expand_question(question)  # version normalisée + alias

        # ── 0. RÉPONSES CONVERSATIONNELLES (sans SQL) ──────────────────────
        intent_conv = detect_conversational_intent(q_lower)
        if intent_conv:
            return {"answer": CONVERSATIONAL_RESPONSES[intent_conv], "sql": None, "data": [], "intent": "conversationnel"}

        # ── 0a. HORS CONTEXTE ───────────────────────────────────────────────
        if _OUT_OF_CONTEXT_PATTERNS.search(_normalize(q_lower)) and not _BUSINESS_RE.search(q_expanded):
            return {"answer": OUT_OF_CONTEXT_RESPONSE, "sql": None, "data": [], "intent": "hors_contexte"}

        # ── 0b. RACCOURCIS INSTANTANÉS (bypass LLM) ─────────────────────────
        shortcut = try_shortcut(question)
        if not shortcut:
            shortcut = smart_fallback(question)
            if shortcut:
                logging.info(f"SMART_FALLBACK HIT: {shortcut['intent']}")
        if shortcut:
            try:
                result = db.execute(text(shortcut["sql"]))
                keys = list(result.keys())
                rows = result.fetchall()
                data = [dict(zip(keys, row)) for row in rows]
                for row in data:
                    for k, v in row.items():
                        if hasattr(v, "isoformat"): row[k] = v.isoformat()
                        elif v is None: row[k] = None
                ans = synthesize_answer_fast(shortcut["answer"], data, shortcut["intent"])
                return {"answer": ans, "sql": shortcut["sql"], "data": data, "intent": shortcut["intent"]}
            except Exception:
                pass  # En cas d'erreur SQL, on continue vers le LLM

        # ── 1. CACHE SQL ────────────────────────────────────────────────────
        cache_key = _cache_key(question)
        sql    = None
        intent = "statistique"
        o      = {}

        if cache_key in SQL_CACHE and not req.history:
            logging.info("CACHE HIT")
            sql = SQL_CACHE[cache_key]
        else:
            # ── 2. GÉNÉRATION SQL via LLM ────────────────────────────────
            system_prompt = build_system_prompt()
            messages = [{"role": "system", "content": system_prompt}]

            # Historique de conversation (3 derniers tours max)
            for msg in req.history[-3:]:
                messages.append({"role": msg.role, "content": msg.content})

            # On envoie la question originale + version normalisée pour aider le LLM
            llm_question = question
            if q_expanded != _normalize(q_lower):
                llm_question = f"{question} [{q_expanded}]"
            messages.append({"role": "user", "content": llm_question})

            try:
                raw = await asyncio.wait_for(
                    invoke_llm(messages, options={"require_json": True, "num_predict": 300, "num_ctx": 768}),
                    timeout=20.0
                )
            except asyncio.TimeoutError:
                logging.warning("LLM timeout — tentative smart_fallback de secours")
                # Tentative de secours : smart_fallback avec la question normalisée
                fallback2 = smart_fallback(q_expanded)
                if fallback2:
                    try:
                        result = db.execute(text(fallback2["sql"]))
                        keys = list(result.keys())
                        rows = result.fetchall()
                        data = [dict(zip(keys, row)) for row in rows]
                        for row in data:
                            for k, v in row.items():
                                if hasattr(v, "isoformat"): row[k] = v.isoformat()
                        ans = synthesize_answer_fast(fallback2["answer"], data, fallback2["intent"])
                        return {"answer": ans, "sql": fallback2["sql"], "data": data, "intent": fallback2["intent"]}
                    except Exception:
                        pass
                return {
                    "answer": (
                        "Je n'ai pas pu traiter votre question dans les délais. "
                        "Reformulez en utilisant des termes précis, par exemple :\n"
                        "• *'chauffeurs disponibles'*\n"
                        "• *'recettes du mois'*\n"
                        "• *'incidents graves non résolus'*\n"
                        "• *'planning de demain'*"
                    ),
                    "sql": None, "data": [], "intent": "erreur"
                }
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

        # ── 4. SYNTHÈSE (sans 2ème appel LLM) ──────────────────────────────
        llm_preanswer = o.get("answer", "") if o else ""
        if sql and data is not None:
            ans = synthesize_answer_fast(llm_preanswer, data, intent)
        else:
            ans = llm_preanswer if llm_preanswer else "Aucune donnée trouvée pour cette question."

        return {"answer": ans, "sql": sql, "data": data, "intent": intent}

    except Exception as e:
        import traceback
        logging.error(f"GLOBAL ERROR: {e}\n{traceback.format_exc()}")
        return {
            "answer": f"Une erreur inattendue s'est produite : {str(e)[:80]}",
            "sql": None, "data": [], "intent": "erreur"
        }


# ─────────────────────────────────────────────
# ENDPOINT STREAMING (SSE) — feedback en temps réel
# ─────────────────────────────────────────────
@router.post("/chat/stream")
@limiter.limit("15/minute")
async def chat_stream(
    req: ChatReq,
    request: Request,
    db: Session = Depends(get_db),
    current_user: Utilisateur = Depends(get_current_user),
):
    async def generate():
        def sse(obj: dict) -> str:
            return f"data: {json.dumps(obj, ensure_ascii=False)}\n\n"

        try:
            question = req.question.strip()

            # 0. Conversationnel
            intent_conv = detect_conversational_intent(question.lower())
            if intent_conv and not req.history:
                yield sse({"type": "done", "answer": CONVERSATIONAL_RESPONSES[intent_conv],
                           "sql": None, "data": [], "intent": "conversationnel"})
                return

            # 0b. RACCOURCIS INSTANTANÉS (bypass LLM) — toujours actif
            shortcut = try_shortcut(question)
            if not shortcut:
                shortcut = smart_fallback(question)
            if shortcut:
                try:
                    result = db.execute(text(shortcut["sql"]))
                    keys = list(result.keys())
                    rows = result.fetchall()
                    data = [dict(zip(keys, row)) for row in rows]
                    for row in data:
                        for k, v in row.items():
                            if hasattr(v, "isoformat"): row[k] = v.isoformat()
                            elif v is None: row[k] = None
                    ans = synthesize_answer_fast(shortcut["answer"], data, shortcut["intent"])
                    yield sse({"type": "done", "answer": ans, "sql": shortcut["sql"],
                               "data": data, "intent": shortcut["intent"]})
                    return
                except Exception:
                    pass  # En cas d'erreur SQL, continue vers le LLM

            yield sse({"type": "status", "msg": "Génération SQL…"})

            # 1. Cache SQL
            cache_key = _cache_key(question)
            sql, intent, llm_preanswer, o = None, "statistique", "", {}

            if cache_key in SQL_CACHE and not req.history:
                sql = SQL_CACHE[cache_key]
            else:
                system_prompt = build_system_prompt()
                messages = [{"role": "system", "content": system_prompt}]
                for msg in req.history[-6:]:
                    messages.append({"role": msg.role, "content": msg.content})
                messages.append({"role": "user", "content": question})

                raw = await invoke_llm(messages, options={"require_json": True, "num_predict": 250, "num_ctx": 512})
                try:
                    o = extract_json(raw)
                    sql = o.get("sql", "").strip()
                    intent = o.get("intent", "statistique")
                    llm_preanswer = o.get("answer", "")
                except Exception:
                    yield sse({"type": "done", "answer": "Je n'ai pas pu interpréter votre question. Reformulez-la.",
                               "sql": None, "data": [], "intent": "erreur"})
                    return

                if sql and not sql.upper().lstrip().startswith("SELECT"):
                    yield sse({"type": "done", "answer": "Seules les requêtes de lecture sont autorisées.",
                               "sql": None, "data": [], "intent": "sécurité"})
                    return

                if sql and not req.history:
                    SQL_CACHE[cache_key] = sql

            # 2. Exécution SQL
            data: list = []
            if sql:
                yield sse({"type": "status", "msg": "Exécution de la requête…"})
                try:
                    result = db.execute(text(sql))
                    keys = list(result.keys())
                    rows = result.fetchall()
                    data = [dict(zip(keys, row)) for row in rows]
                    for row in data:
                        for k, v in row.items():
                            if hasattr(v, "isoformat"):
                                row[k] = v.isoformat()
                            elif v is None:
                                row[k] = None
                except SQLAlchemyError as db_err:
                    err_str = str(db_err)[:300]
                    fixed_sql = await auto_fix_sql(sql, err_str, question)
                    if fixed_sql:
                        try:
                            result = db.execute(text(fixed_sql))
                            keys = list(result.keys())
                            rows = result.fetchall()
                            data = [dict(zip(keys, row)) for row in rows]
                            for row in data:
                                for k, v in row.items():
                                    if hasattr(v, "isoformat"): row[k] = v.isoformat()
                            sql = fixed_sql
                        except SQLAlchemyError:
                            yield sse({"type": "done", "answer": "La requête a échoué même après correction.",
                                       "sql": sql, "data": [], "intent": intent})
                            return
                    else:
                        yield sse({"type": "done", "answer": f"Erreur SQL : {err_str[:100]}",
                                   "sql": sql, "data": [], "intent": intent})
                        return

            # 3. Synthèse
            ans = synthesize_answer_fast(llm_preanswer, data, intent) if sql else (llm_preanswer or "Aucune donnée trouvée.")
            yield sse({"type": "done", "answer": ans, "sql": sql, "data": data, "intent": intent})

        except Exception as e:
            import traceback
            logging.error(f"STREAM ERROR: {e}\n{traceback.format_exc()}")
            yield sse({"type": "done", "answer": f"Erreur : {str(e)[:80]}", "sql": None, "data": [], "intent": "erreur"})

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
