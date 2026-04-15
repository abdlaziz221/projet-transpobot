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
SCHEMA_INFO = """Base SQLite — schéma complet :
vehicules(id,immatriculation TEXT,type TEXT[Bus/Minibus/Express],capacite INT,statut TEXT[actif/inactif/maintenance],kilometrage INT,date_acquisition DATE)
chauffeurs(id,nom TEXT,prenom TEXT,telephone TEXT,numero_permis TEXT,disponibilite BOOL[0/1],date_embauche DATE)
lignes(id,code TEXT,nom TEXT,origine TEXT,destination TEXT,distance_km INT,duree_minutes INT)
trajets(id,ligne_id FK,chauffeur_id FK,vehicule_id FK,date_heure_depart DATETIME,date_heure_arrivee DATETIME,statut TEXT[termine/en_cours/annule/planifie],nb_passagers INT,recette INT)
incidents(id,trajet_id FK→trajets.id,type TEXT,gravite TEXT[faible/moyen/grave],description TEXT,date_incident DATETIME,resolu BOOL[0/1])
maintenance(id,vehicule_id FK,type TEXT,description TEXT,date_prevue DATE,cout INT,kilometrage INT,effectuee BOOL[0/1])
tarifs(id,ligne_id FK,type_client TEXT[normal/etudiant],prix INT,date_debut DATE,date_fin DATE)
plannings(id,ligne_id FK,chauffeur_id FK,vehicule_id FK,date_heure_depart_prevue DATETIME,statut TEXT[planifie/effectue/annule])
JOINTURES: incidents→trajets(trajet_id), trajets→chauffeurs(chauffeur_id), trajets→vehicules(vehicule_id), trajets→lignes(ligne_id)
SQLite: CONCAT(a,' ',b) pour concat, strftime('%Y-%m',col) pour mois, date('now') pour aujourd'hui, date('now','-N days/months') pour dates relatives"""

# ─────────────────────────────────────────────
# FEW-SHOT EXAMPLES  (exemples JSON compacts)
# ─────────────────────────────────────────────
FEW_SHOT_EXAMPLES = """Exemples JSON (respecte exactement ce format) :
Q:chauffeurs disponibles→{"sql":"SELECT nom,prenom,telephone FROM chauffeurs WHERE disponibilite=1 ORDER BY nom","answer":"Chauffeurs disponibles:","intent":"liste"}
Q:recette totale→{"sql":"SELECT SUM(recette) AS total FROM trajets WHERE statut='termine'","answer":"Recette totale:","intent":"financier"}
Q:incidents graves non résolus→{"sql":"SELECT COUNT(*) AS nb FROM incidents WHERE gravite='grave' AND resolu=0","answer":"Incidents graves ouverts:","intent":"statistique"}
Q:chauffeur avec le plus d'incidents→{"sql":"SELECT CONCAT(c.prenom,' ',c.nom) AS chauffeur,COUNT(i.id) AS nb_incidents FROM incidents i JOIN trajets t ON i.trajet_id=t.id JOIN chauffeurs c ON t.chauffeur_id=c.id GROUP BY c.id ORDER BY nb_incidents DESC LIMIT 5","answer":"Chauffeurs par incidents:","intent":"statistique"}
Q:recettes par mois→{"sql":"SELECT strftime('%Y-%m',date_heure_depart) AS mois,SUM(recette) AS total FROM trajets WHERE statut='termine' GROUP BY mois ORDER BY mois DESC LIMIT 6","answer":"Recettes par mois:","intent":"financier"}
Q:véhicules en maintenance→{"sql":"SELECT v.immatriculation,v.type,m.type AS maintenance,m.date_prevue FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id WHERE m.effectuee=0 ORDER BY m.date_prevue","answer":"Véhicules en maintenance:","intent":"maintenance"}
Q:taux occupation lignes→{"sql":"SELECT l.nom,ROUND(AVG(t.nb_passagers*100.0/v.capacite),1) AS taux_pct FROM trajets t JOIN vehicules v ON t.vehicule_id=v.id JOIN lignes l ON t.ligne_id=l.id WHERE t.statut='termine' AND v.capacite>0 GROUP BY l.id ORDER BY taux_pct DESC","answer":"Taux d'occupation:","intent":"statistique"}"""

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
# CONSTRUCTION DU PROMPT SYSTÈME  (compact, sans requêtes DB)
# ─────────────────────────────────────────────
def build_system_prompt() -> str:
    now = time.time()
    if _PROMPT_CACHE["prompt"] and (now - _PROMPT_CACHE["ts"]) < _PROMPT_TTL:
        return _PROMPT_CACHE["prompt"]
    today = datetime.now().strftime("%d/%m/%Y")
    prompt = f"""Tu es un expert SQL SQLite. Date:{today}
{SCHEMA_INFO}
{FEW_SHOT_EXAMPLES}
Réponds UNIQUEMENT JSON sans markdown:{{"sql":"SELECT...","answer":"réponse française","intent":"liste|statistique|financier|maintenance|incident"}}"""
    _PROMPT_CACHE["prompt"] = prompt
    _PROMPT_CACHE["ts"] = now
    return prompt


# ─────────────────────────────────────────────
# RACCOURCIS INSTANTANÉS  (bypass LLM pour requêtes fréquentes)
# ─────────────────────────────────────────────
_SHORTCUTS = [
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
     "SELECT v.immatriculation, v.type, v.kilometrage, m.type AS type_maintenance, m.date_prevue, CAST(julianday(m.date_prevue)-julianday('now') AS INTEGER) AS jours_restants FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id WHERE m.effectuee=0 ORDER BY m.date_prevue LIMIT 10",
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
     "SELECT COUNT(*) AS trajets_semaine, SUM(CASE WHEN statut='termine' THEN 1 ELSE 0 END) AS termines, SUM(CASE WHEN statut='en_cours' THEN 1 ELSE 0 END) AS en_cours FROM trajets WHERE date(date_heure_depart)>=date('now','-7 days')",
     "Trajets cette semaine :", "statistique"),
    (r"combien.{0,25}trajet.{0,25}(aujourd|du.jour|ce.jour|journ[eé]e)",
     "SELECT COUNT(*) AS trajets_aujourd_hui, SUM(CASE WHEN statut='termine' THEN 1 ELSE 0 END) AS termines FROM trajets WHERE date(date_heure_depart)=date('now')",
     "Trajets aujourd'hui :", "statistique"),
    (r"combien.{0,25}trajet.{0,25}(mois|mensuel)",
     "SELECT COUNT(*) AS trajets_mois, SUM(CASE WHEN statut='termine' THEN 1 ELSE 0 END) AS termines FROM trajets WHERE strftime('%Y-%m',date_heure_depart)=strftime('%Y-%m',date('now'))",
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
     "SELECT SUM(nb_passagers) AS passagers_jour, COUNT(*) AS nb_trajets FROM trajets WHERE statut='termine' AND date(date_heure_depart)=date('now')",
     "Passagers du jour :", "statistique"),
    (r"combien.{0,20}passager.{0,25}(semaine|7.jour)",
     "SELECT SUM(nb_passagers) AS passagers_semaine, COUNT(*) AS nb_trajets FROM trajets WHERE statut='termine' AND date(date_heure_depart)>=date('now','-7 days')",
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
     "SELECT nom, prenom, date_embauche, CAST((julianday('now')-julianday(date_embauche))/365 AS INTEGER) AS annees_service FROM chauffeurs ORDER BY date_embauche ASC",
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
     "SELECT strftime('%Y-%m', date_incident) AS mois, COUNT(*) AS nb, SUM(CASE WHEN gravite='grave' THEN 1 ELSE 0 END) AS graves FROM incidents GROUP BY mois ORDER BY mois DESC LIMIT 12",
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
     "SELECT v.immatriculation, v.type, m.type AS maintenance, m.date_prevue, m.cout, CAST(julianday(m.date_prevue)-julianday('now') AS INTEGER) AS jours_restants FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id WHERE m.effectuee=0 ORDER BY m.date_prevue",
     "Maintenances en attente :", "maintenance"),
    (r"maintenance[s]?.{0,20}(effectu[eé]|termin[eé]|fait[s]?|pass[eé])",
     "SELECT v.immatriculation, m.type AS maintenance, m.date_prevue, m.cout FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id WHERE m.effectuee=1 ORDER BY m.date_prevue DESC LIMIT 20",
     "Maintenances effectuées :", "maintenance"),
    (r"(co[uû]t|montant|d[eé]pense).{0,20}maintenance",
     "SELECT strftime('%Y-%m', date_prevue) AS mois, SUM(cout) AS total, COUNT(*) AS nb FROM maintenance GROUP BY mois ORDER BY mois DESC LIMIT 12",
     "Coûts de maintenance par mois :", "financier"),
    (r"co[uû]t.{0,20}(total|global).{0,20}maintenance|budget.{0,15}maintenance",
     "SELECT SUM(cout) AS cout_total, SUM(CASE WHEN effectuee=1 THEN cout ELSE 0 END) AS effectue, SUM(CASE WHEN effectuee=0 THEN cout ELSE 0 END) AS prevu FROM maintenance",
     "Coût total de maintenance :", "financier"),
    (r"prochaine.{0,20}maintenance",
     "SELECT v.immatriculation, v.type, m.type AS maintenance, m.date_prevue, CAST(julianday(m.date_prevue)-julianday('now') AS INTEGER) AS jours_restants FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id WHERE m.effectuee=0 AND date(m.date_prevue)>=date('now') ORDER BY m.date_prevue LIMIT 10",
     "Prochaines maintenances :", "maintenance"),
    (r"maintenance.{0,25}urgent|urgent.{0,25}maintenance",
     "SELECT v.immatriculation, v.type, m.type AS maintenance, m.date_prevue, CAST(julianday(m.date_prevue)-julianday('now') AS INTEGER) AS jours_restants FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id WHERE m.effectuee=0 AND date(m.date_prevue)<=date('now','+7 days') ORDER BY m.date_prevue",
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
     "SELECT strftime('%Y-%m', date_heure_depart) AS mois, SUM(recette) AS recette_totale, COUNT(*) AS nb_trajets, SUM(nb_passagers) AS passagers FROM trajets WHERE statut='termine' GROUP BY mois ORDER BY mois DESC LIMIT 12",
     "Recettes par mois :", "financier"),
    (r"recette[s]?.{0,25}(semaine|hebdo)",
     "SELECT strftime('%W-%Y', date_heure_depart) AS semaine, SUM(recette) AS recette_totale, COUNT(*) AS nb_trajets FROM trajets WHERE statut='termine' GROUP BY semaine ORDER BY semaine DESC LIMIT 8",
     "Recettes par semaine :", "financier"),
    (r"recette[s]?.{0,15}(aujourd|du.jour|journ[eé]e)",
     "SELECT SUM(recette) AS recette_jour, COUNT(*) AS nb_trajets FROM trajets WHERE statut='termine' AND date(date_heure_depart)=date('now')",
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
     "SELECT strftime('%Y-%m', date_heure_depart) AS mois, SUM(nb_passagers) AS nb_passagers, COUNT(*) AS nb_trajets FROM trajets WHERE statut='termine' GROUP BY mois ORDER BY mois DESC LIMIT 12",
     "Passagers par mois :", "statistique"),
    (r"passager.{0,20}(moyen|moy|par.trajet)",
     "SELECT ROUND(AVG(nb_passagers),1) AS moy_passagers_trajet, MAX(nb_passagers) AS max, MIN(nb_passagers) AS min FROM trajets WHERE statut='termine'",
     "Passagers moyens par trajet :", "statistique"),
    # == TRAJETS ==
    (r"trajet[s]?.{0,20}(aujourd|du.jour|journ[eé]e)",
     "SELECT t.date_heure_depart, l.nom AS ligne, CONCAT(c.prenom,' ',c.nom) AS chauffeur, t.statut, t.nb_passagers FROM trajets t JOIN lignes l ON t.ligne_id=l.id JOIN chauffeurs c ON t.chauffeur_id=c.id WHERE date(t.date_heure_depart)=date('now') ORDER BY t.date_heure_depart",
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
     "SELECT (SELECT COUNT(*) FROM vehicules WHERE statut='actif') AS vehicules_actifs, (SELECT COUNT(*) FROM vehicules) AS total_vehicules, (SELECT COUNT(*) FROM chauffeurs WHERE disponibilite=1) AS chauffeurs_disponibles, (SELECT COUNT(*) FROM incidents WHERE resolu=0) AS incidents_ouverts, (SELECT COUNT(*) FROM incidents WHERE gravite='grave' AND resolu=0) AS incidents_graves, (SELECT COALESCE(SUM(recette),0) FROM trajets WHERE statut='termine' AND date(date_heure_depart)=date('now')) AS recette_jour, (SELECT COUNT(*) FROM trajets WHERE date(date_heure_depart)=date('now')) AS trajets_aujourd_hui, (SELECT COUNT(*) FROM maintenance WHERE effectuee=0) AS maintenances_en_attente",
     "Tableau de bord :", "statistique"),
    # == PLANNING ==
    (r"planning.{0,25}(demain|lendemain)",
     "SELECT p.date_heure_depart_prevue, l.nom AS ligne, CONCAT(c.prenom,' ',c.nom) AS chauffeur, v.immatriculation, p.statut FROM plannings p JOIN lignes l ON p.ligne_id=l.id JOIN chauffeurs c ON p.chauffeur_id=c.id JOIN vehicules v ON p.vehicule_id=v.id WHERE date(p.date_heure_depart_prevue)=date('now','+1 day') ORDER BY p.date_heure_depart_prevue",
     "Planning de demain :", "planning"),
    (r"planning.{0,25}(semaine|7.jour|hebdo)",
     "SELECT p.date_heure_depart_prevue, l.nom AS ligne, CONCAT(c.prenom,' ',c.nom) AS chauffeur, p.statut FROM plannings p JOIN lignes l ON p.ligne_id=l.id JOIN chauffeurs c ON p.chauffeur_id=c.id WHERE date(p.date_heure_depart_prevue) BETWEEN date('now') AND date('now','+7 days') ORDER BY p.date_heure_depart_prevue",
     "Planning de la semaine :", "planning"),
    (r"planning",
     "SELECT p.date_heure_depart_prevue, l.nom AS ligne, CONCAT(c.prenom,' ',c.nom) AS chauffeur, v.immatriculation, p.statut FROM plannings p JOIN lignes l ON p.ligne_id=l.id JOIN chauffeurs c ON p.chauffeur_id=c.id JOIN vehicules v ON p.vehicule_id=v.id WHERE date(p.date_heure_depart_prevue)=date('now') ORDER BY p.date_heure_depart_prevue",
     "Planning du jour :", "planning"),
    # == TARIFS ==
    (r"tarif[s]?.{0,10}[eé]tudiant",
     "SELECT l.nom, tf.prix FROM tarifs tf JOIN lignes l ON tf.ligne_id=l.id WHERE tf.type_client='etudiant' AND date('now') BETWEEN tf.date_debut AND tf.date_fin ORDER BY l.nom",
     "Tarifs étudiants :", "liste"),
    (r"tarif[s]?.{0,10}normal",
     "SELECT l.nom, tf.prix FROM tarifs tf JOIN lignes l ON tf.ligne_id=l.id WHERE tf.type_client='normal' AND date('now') BETWEEN tf.date_debut AND tf.date_fin ORDER BY l.nom",
     "Tarifs normaux :", "liste"),
    (r"(diff[eé]rence|compar).{0,20}(tarif|prix)",
     "SELECT l.nom, MAX(CASE WHEN tf.type_client='normal' THEN tf.prix END) AS tarif_normal, MAX(CASE WHEN tf.type_client='etudiant' THEN tf.prix END) AS tarif_etudiant FROM tarifs tf JOIN lignes l ON tf.ligne_id=l.id GROUP BY l.id ORDER BY l.nom",
     "Comparaison des tarifs :", "liste"),
    (r"tarif|prix.{0,15}(billet|ticket|voyage|transport)",
     "SELECT l.nom, tf.type_client, tf.prix FROM tarifs tf JOIN lignes l ON tf.ligne_id=l.id WHERE date('now') BETWEEN tf.date_debut AND tf.date_fin ORDER BY l.nom, tf.type_client",
     "Tous les tarifs :", "liste"),
]


def try_shortcut(question: str) -> dict | None:
    """Retourne {sql, answer, intent} si la question correspond à un raccourci, sinon None."""
    q = question.lower()
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
    q = question.lower()

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
            where.append(f"date({date_col})=date('now')")
        elif re.search(r"\bhier\b", q):
            where.append(f"date({date_col})=date('now','-1 day')")
        elif re.search(r"cette.semaine|7.jours", q):
            where.append(f"date({date_col})>=date('now','-7 days')")
        elif re.search(r"ce.mois", q):
            where.append(f"strftime('%Y-%m',{date_col})=strftime('%Y-%m',date('now'))")
        elif re.search(r"30.jours|dernier.mois", q):
            where.append(f"date({date_col})>=date('now','-30 days')")

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
            sql = "SELECT strftime('%Y-%m', date_incident) AS mois, COUNT(*) AS nb, SUM(CASE WHEN gravite='grave' THEN 1 ELSE 0 END) AS graves FROM incidents GROUP BY mois ORDER BY mois DESC LIMIT 12"
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
            sql = "SELECT strftime('%Y-%m', date_heure_depart) AS mois, SUM(recette) AS total, COUNT(*) AS nb FROM trajets WHERE statut='termine' GROUP BY mois ORDER BY mois DESC LIMIT 6"
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
            sql = "SELECT strftime('%Y-%m', date_prevue) AS mois, SUM(cout) AS total, COUNT(*) AS nb FROM maintenance GROUP BY mois ORDER BY mois DESC LIMIT 6"
            answer = "Coûts de maintenance par mois :"
            intent = "financier"
        elif re.search(r"urgent|bient[oô]t|prochain", q):
            sql = "SELECT v.immatriculation, m.type, m.date_prevue, m.cout, CAST(julianday(m.date_prevue)-julianday('now') AS INTEGER) AS jours_restants FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id WHERE m.effectuee=0 AND m.date_prevue<=date('now','+14 days') ORDER BY m.date_prevue"
            answer = "Maintenances urgentes :"
        else:
            sql = f"SELECT v.immatriculation, m.type, m.date_prevue, m.cout, m.effectuee FROM maintenance m JOIN vehicules v ON m.vehicule_id=v.id {wstr} ORDER BY m.date_prevue"
            answer = "Liste des maintenances :"
        intent = "maintenance"

    elif entity == "tarif":
        wstr_tarif = ("WHERE " + " AND ".join(where + ["date('now') BETWEEN tf.date_debut AND tf.date_fin"])) if where else "WHERE date('now') BETWEEN tf.date_debut AND tf.date_fin"
        sql = f"SELECT l.nom, tf.type_client, tf.prix FROM tarifs tf JOIN lignes l ON tf.ligne_id=l.id {wstr_tarif} ORDER BY l.nom, tf.type_client"
        answer = "Tarifs en vigueur :"
        intent = "liste"

    elif entity == "planning":
        if re.search(r"demain", q):
            sql = "SELECT p.date_heure_depart_prevue, l.nom AS ligne, CONCAT(c.prenom, ' ', c.nom) AS chauffeur, v.immatriculation FROM plannings p JOIN lignes l ON p.ligne_id=l.id JOIN chauffeurs c ON p.chauffeur_id=c.id JOIN vehicules v ON p.vehicule_id=v.id WHERE date(p.date_heure_depart_prevue)=date('now','+1 day') ORDER BY p.date_heure_depart_prevue"
            answer = "Planning de demain :"
        elif re.search(r"semaine", q):
            sql = "SELECT p.date_heure_depart_prevue, l.nom AS ligne, CONCAT(c.prenom, ' ', c.nom) AS chauffeur, p.statut FROM plannings p JOIN lignes l ON p.ligne_id=l.id JOIN chauffeurs c ON p.chauffeur_id=c.id WHERE date(p.date_heure_depart_prevue) BETWEEN date('now') AND date('now','+7 days') ORDER BY p.date_heure_depart_prevue"
            answer = "Planning de la semaine :"
        else:
            sql = "SELECT p.date_heure_depart_prevue, l.nom AS ligne, CONCAT(c.prenom, ' ', c.nom) AS chauffeur, v.immatriculation, p.statut FROM plannings p JOIN lignes l ON p.ligne_id=l.id JOIN chauffeurs c ON p.chauffeur_id=c.id JOIN vehicules v ON p.vehicule_id=v.id WHERE date(p.date_heure_depart_prevue)=date('now') ORDER BY p.date_heure_depart_prevue"
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
            sql = "SELECT SUM(recette) AS recette_jour, SUM(nb_passagers) AS passagers_jour FROM trajets WHERE statut='termine' AND date(date_heure_depart)=date('now')"
            answer = "Recettes du jour :"
        elif re.search(r"semaine", q):
            sql = "SELECT SUM(recette) AS recette_semaine, SUM(nb_passagers) AS passagers_semaine FROM trajets WHERE statut='termine' AND date(date_heure_depart)>=date('now','-7 days')"
            answer = "Recettes de la semaine :"
        else:
            sql = "SELECT strftime('%Y-%m', date_heure_depart) AS mois, SUM(recette) AS recette_totale, SUM(nb_passagers) AS total_passagers FROM trajets WHERE statut='termine' GROUP BY mois ORDER BY mois DESC LIMIT 12"
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
                "Tu es un expert SQLite. Corrige la requête SQL ci-dessous qui a produit une erreur. "
                "Utilise la syntaxe SQLite : CONCAT(prenom,' ',nom) pour concat, strftime('%Y-%m',col) pour dates, date('now') pour aujourd'hui. "
                "Retourne UNIQUEMENT la requête SQL corrigée, sans explication, sans markdown."
            )
        },
        {
            "role": "user",
            "content": (
                f"Question originale : {question}\n"
                f"Requête SQL fautive :\n{original_sql}\n"
                f"Erreur SQLite :\n{error_msg}\n\n"
                "Génère une requête SQLite corrigée qui répond à la question :"
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
# SYNTHÈSE SANS LLM  (remplace le 2ème appel LLM — x2 plus rapide)
# ─────────────────────────────────────────────
def _fmt_val(key: str, val) -> str:
    """Formate une valeur avec son unité contextuelle."""
    if val is None:
        return "—"
    k = key.lower()
    if isinstance(val, float):
        if any(x in k for x in ("recette", "cout", "prix", "revenu", "montant")):
            return f"{val:,.0f} FCFA"
        return f"{val:,.1f}"
    if isinstance(val, int):
        if any(x in k for x in ("trajet", "voyage")):   return f"{val} trajet{'s' if val > 1 else ''}"
        if any(x in k for x in ("incident",)):           return f"{val} incident{'s' if val > 1 else ''}"
        if any(x in k for x in ("passager",)):           return f"{val} passager{'s' if val > 1 else ''}"
        if any(x in k for x in ("km", "kilom")):         return f"{val:,} km"
        if any(x in k for x in ("jour",)):               return f"{val} jour{'s' if val > 1 else ''}"
        return str(val)
    return str(val)


def synthesize_answer_fast(label: str, data: list, intent: str) -> str:
    """
    Génère une réponse textuelle précise basée sur les vraies données.
    """
    if not data:
        return "Aucun résultat trouvé dans la base de données."

    n    = len(data)
    cols = list(data[0].keys())
    row0 = data[0]

    # Colonnes à ignorer dans l'affichage (booléens, IDs techniques)
    _skip = {"id", "resolu", "disponibilite", "effectuee"}

    # ── 1. Valeur unique (COUNT, SUM…) ─────────────────────────────────────
    if n == 1 and len(cols) <= 3:
        num_vals = {k: v for k, v in row0.items() if isinstance(v, (int, float))}
        if num_vals:
            parts = [f"**{_fmt_val(k, v)}**" for k, v in num_vals.items()]
            return f"{label} {', '.join(parts)}"

    # ── 2. Classement (1ère colonne = texte, reste = numériques signifiants) ──
    first_col  = cols[0]
    _bool_keys = {"resolu", "disponibilite", "effectuee"}
    num_cols = [
        c for c in cols[1:]
        if isinstance(row0.get(c), (int, float))
        and c.lower() not in _bool_keys
        and max((row.get(c, 0) or 0) for row in data) > 1
    ]
    is_ranking = isinstance(row0.get(first_col), str) and bool(num_cols)

    if is_ranking and n > 1:
        sort_col = num_cols[0]
        if any("recette" in c for c in num_cols):    sort_col = next(c for c in num_cols if "recette" in c)
        elif any("trajet" in c for c in num_cols):   sort_col = next(c for c in num_cols if "trajet" in c)
        elif any("incident" in c for c in num_cols): sort_col = next(c for c in num_cols if "incident" in c)

        critere = {
            **{c: "nombre de trajets" for c in num_cols if "trajet" in c},
            **{c: "recettes générées" for c in num_cols if "recette" in c},
            **{c: "incidents" for c in num_cols if "incident" in c},
            **{c: "kilométrage" for c in num_cols if "km" in c or "kilom" in c},
        }.get(sort_col, sort_col.replace("_", " "))

        medals = ["🥇", "🥈", "🥉"] + [f"{i+1}." for i in range(3, 10)]
        lines  = [f"{label} classement par **{critere}** ({n} résultat{'s' if n > 1 else ''}) :"]
        for i, row in enumerate(data[:10]):
            name    = str(row[first_col])
            details = " · ".join(_fmt_val(c, row[c]) for c in num_cols if row.get(c) is not None)
            lines.append(f"{medals[i]} **{name}** — {details}")
        if n > 10:
            lines.append(f"_... {n - 10} autres dans le tableau._")
        return "\n".join(lines)

    # ── 3. Distribution (2 colonnes : catégorie + count) ───────────────────
    if len(cols) == 2 and n <= 8:
        total = sum(row[cols[1]] for row in data if isinstance(row.get(cols[1]), (int, float)))
        if total > 0:
            parts = []
            for row in data:
                k = str(row[cols[0]])
                v = row[cols[1]]
                if isinstance(v, (int, float)):
                    pct = round(v / total * 100)
                    parts.append(f"**{k}** : {_fmt_val(cols[1], v)} ({pct} %)")
            if parts:
                return f"{label}\n" + "\n".join(f"• {p}" for p in parts)

    # ── 4. Résultat unique avec plusieurs colonnes (ex: tableau de bord) ────
    if n == 1:
        _labels = {
            "vehicules_actifs": "🚌 véhicules actifs",
            "total_vehicules": "/ total",
            "chauffeurs_disponibles": "👤 chauffeurs disponibles",
            "chauffeurs_dispo": "👤 chauffeurs disponibles",
            "incidents_ouverts": "⚠️ incidents ouverts",
            "incidents_graves": "dont graves",
            "recette_jour": "💰 recette du jour",
            "trajets_aujourd_hui": "🛣️ trajets aujourd'hui",
            "maintenances_en_attente": "🔧 maintenances en attente",
        }
        parts = []
        for k, v in row0.items():
            if v is not None:
                nice = _labels.get(k, k.replace("_", " "))
                parts.append(f"**{_fmt_val(k, v)}** {nice}")
        return f"{label}\n" + " · ".join(parts)

    # ── 5. Liste générale : énumère les items avec leurs détails ───────────
    entity_hint = label.lower()
    if   "chauffeur" in entity_hint: noun = "chauffeur" + ("s" if n > 1 else "")
    elif "véhicule"  in entity_hint or "vehicule" in entity_hint: noun = "véhicule" + ("s" if n > 1 else "")
    elif "incident"  in entity_hint: noun = "incident" + ("s" if n > 1 else "")
    elif "trajet"    in entity_hint: noun = "trajet" + ("s" if n > 1 else "")
    elif "ligne"     in entity_hint: noun = "ligne" + ("s" if n > 1 else "")
    elif "maintenance" in entity_hint: noun = "maintenance" + ("s" if n > 1 else "")
    elif "tarif"     in entity_hint: noun = "tarif" + ("s" if n > 1 else "")
    else: noun = "résultat" + ("s" if n > 1 else "")

    # Colonnes utiles à afficher (max 5, sans les techniques)
    display_cols = [c for c in cols if c.lower() not in _skip][:5]

    lines = [f"{label} **{n} {noun}** :"]
    for row in data[:12]:
        parts = []
        for c in display_cols:
            v = row.get(c)
            if v is not None and str(v).strip() and str(v) != "None":
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
        question = req.question.strip()
        q_lower  = question.lower()

        # ── 0. RÉPONSES CONVERSATIONNELLES (sans SQL) ──────────────────────
        intent_conv = detect_conversational_intent(q_lower)
        if intent_conv and not req.history:
            return {"answer": CONVERSATIONAL_RESPONSES[intent_conv], "sql": None, "data": [], "intent": "conversationnel"}

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
            # ── 2. GÉNÉRATION SQL (PASS 1) ───────────────────────────────
            system_prompt = build_system_prompt()
            messages = [{"role": "system", "content": system_prompt}]

            # Historique de conversation (3 derniers tours max)
            for msg in req.history[-3:]:
                messages.append({"role": msg.role, "content": msg.content})

            messages.append({"role": "user", "content": question})

            try:
                raw = await asyncio.wait_for(
                    invoke_llm(messages, options={"require_json": True, "num_predict": 250, "num_ctx": 512}),
                    timeout=15.0
                )
            except asyncio.TimeoutError:
                logging.warning("LLM timeout after 15s — question non reconnue")
                return {
                    "answer": (
                        "Je n'ai pas reconnu cette question. Soyez plus précis, par exemple :\n"
                        "• *'liste des chauffeurs disponibles'*\n"
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
