from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List
import datetime

try:
    from database import get_db
    from models import Trajet, Ligne, Chauffeur, Vehicule, Incident
except ImportError:
    from ..database import get_db
    from ..models import Trajet, Ligne, Chauffeur, Vehicule, Incident

router = APIRouter(prefix="/api/trajets_custom", tags=["Trajets Custom"])

@router.get("")
def get_trajets_custom(
    statut: Optional[List[str]] = Query(None),
    ligne_id: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Liste paginée des trajets avec détails des lignes, chauffeurs et véhicules."""
    query = db.query(
        Trajet.id,
        Trajet.date_heure_depart,
        Trajet.date_heure_arrivee,
        Trajet.statut,
        Trajet.nb_passagers,
        Trajet.recette,
        Ligne.origine,
        Ligne.destination,
        Ligne.code.label("ligne_code"),
        Ligne.nom.label("ligne_nom"),
        Chauffeur.nom.label("chauffeur_nom"),
        Chauffeur.prenom.label("chauffeur_prenom"),
        Vehicule.immatriculation.label("vehicule_immat"),
        Vehicule.type.label("vehicule_type"),
    ).join(Ligne, Trajet.ligne_id == Ligne.id)\
     .join(Chauffeur, Trajet.chauffeur_id == Chauffeur.id)\
     .join(Vehicule, Trajet.vehicule_id == Vehicule.id)

    if statut:
        if len(statut) == 1 and statut[0].lower() == "all":
            pass  # No filter
        else:
            query = query.filter(Trajet.statut.in_(statut))

    if ligne_id:
        query = query.filter(Trajet.ligne_id == ligne_id)

    # Compte total pour pagination
    total = query.count()

    results = query.order_by(Trajet.date_heure_depart.desc())\
                   .offset((page - 1) * limit)\
                   .limit(limit).all()

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
        "data": [
            {
                "id": r.id,
                "date_heure_depart": r.date_heure_depart.isoformat() if r.date_heure_depart else None,
                "date_heure_arrivee": r.date_heure_arrivee.isoformat() if r.date_heure_arrivee else None,
                "statut": r.statut,
                "nb_passagers": r.nb_passagers,
                "recette": float(r.recette) if r.recette else 0,
                "origine": r.origine,
                "destination": r.destination,
                "ligne_code": r.ligne_code,
                "ligne_nom": r.ligne_nom,
                "chauffeur": f"{r.chauffeur_prenom} {r.chauffeur_nom}",
                "vehicule": r.vehicule_immat,
                "vehicule_type": r.vehicule_type,
            } for r in results
        ]
    }


@router.get("/map_data")
def get_map_data(db: Session = Depends(get_db)):
    """Données optimisées pour la carte temps réel : réseau de lignes, trafic, incidents."""
    now = datetime.datetime.now()
    week_ago = now - datetime.timedelta(days=7)

    # 1. Toutes les lignes du réseau
    lines = db.query(Ligne).all()

    # 2. Activité récente par ligne (7 derniers jours)
    recent = db.query(
        Trajet.ligne_id,
        func.count(Trajet.id).label("trip_count"),
        func.coalesce(func.sum(Trajet.nb_passagers), 0).label("total_passengers"),
    ).filter(
        Trajet.date_heure_depart >= week_ago,
        Trajet.statut.in_(["en_cours", "termine"]),
    ).group_by(Trajet.ligne_id).all()

    recent_map = {
        r.ligne_id: {"count": r.trip_count, "passengers": int(r.total_passengers)}
        for r in recent
    }

    # 3. Incidents ouverts par ligne
    open_incidents = db.query(
        Trajet.ligne_id,
        Incident.gravite,
        Incident.type,
    ).join(Trajet, Incident.trajet_id == Trajet.id)\
     .filter(Incident.resolu == False).all()

    incident_map: dict = {}
    for inc in open_incidents:
        lid = inc.ligne_id
        # Keep worst gravity
        priority = {"critique": 3, "grave": 2, "moyen": 1, "faible": 0}
        if lid not in incident_map or priority.get(inc.gravite, 0) > priority.get(incident_map[lid], 0):
            incident_map[lid] = inc.gravite

    # 4. Trajets en cours (véhicules à localiser)
    active_q = db.query(
        Trajet.id,
        Trajet.ligne_id,
        Trajet.date_heure_depart,
        Trajet.date_heure_arrivee,
        Trajet.nb_passagers,
        Ligne.origine,
        Ligne.destination,
        Ligne.code.label("ligne_code"),
        Chauffeur.nom.label("chauffeur_nom"),
        Chauffeur.prenom.label("chauffeur_prenom"),
        Vehicule.immatriculation.label("vehicule"),
        Vehicule.type.label("vehicule_type"),
    ).join(Ligne, Trajet.ligne_id == Ligne.id)\
     .join(Chauffeur, Trajet.chauffeur_id == Chauffeur.id)\
     .join(Vehicule, Trajet.vehicule_id == Vehicule.id)\
     .filter(Trajet.statut == "en_cours").all()

    # 5. Aussi les trajets programmés pour aujourd'hui (à venir)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    scheduled_q = db.query(
        Trajet.id,
        Trajet.ligne_id,
        Trajet.date_heure_depart,
        Trajet.date_heure_arrivee,
        Trajet.nb_passagers,
        Ligne.origine,
        Ligne.destination,
        Ligne.code.label("ligne_code"),
    ).join(Ligne, Trajet.ligne_id == Ligne.id)\
     .filter(
        Trajet.statut == "programme",
        Trajet.date_heure_depart >= today_start,
     ).limit(20).all()

    return {
        "lines": [
            {
                "id": l.id,
                "code": l.code,
                "nom": l.nom,
                "origine": l.origine,
                "destination": l.destination,
                "distance_km": l.distance_km,
                "recent_trips": recent_map.get(l.id, {}).get("count", 0),
                "total_passengers": recent_map.get(l.id, {}).get("passengers", 0),
                "has_incident": l.id in incident_map,
                "incident_gravite": incident_map.get(l.id, ""),
            }
            for l in lines
        ],
        "active_trips": [
            {
                "id": t.id,
                "ligne_id": t.ligne_id,
                "ligne_code": t.ligne_code,
                "origine": t.origine,
                "destination": t.destination,
                "date_heure_depart": t.date_heure_depart.isoformat() if t.date_heure_depart else None,
                "date_heure_arrivee": t.date_heure_arrivee.isoformat() if t.date_heure_arrivee else None,
                "nb_passagers": t.nb_passagers,
                "chauffeur": f"{t.chauffeur_prenom} {t.chauffeur_nom}",
                "vehicule": t.vehicule,
                "vehicule_type": t.vehicule_type,
            }
            for t in active_q
        ],
        "scheduled_today": [
            {
                "id": t.id,
                "ligne_code": t.ligne_code,
                "origine": t.origine,
                "destination": t.destination,
                "depart": t.date_heure_depart.isoformat() if t.date_heure_depart else None,
            }
            for t in scheduled_q
        ],
        "stats": {
            "total_lines": len(lines),
            "active_trips": len(active_q),
            "scheduled_today": len(scheduled_q),
            "lines_with_recent_activity": len([l for l in lines if recent_map.get(l.id, {}).get("count", 0) > 0]),
            "open_incidents": len(incident_map),
        },
    }
