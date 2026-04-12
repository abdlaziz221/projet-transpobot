from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

try:
    from database import get_db
    from models import Trajet, Ligne, Chauffeur, Vehicule
except ImportError:
    from ..database import get_db
    from ..models import Trajet, Ligne, Chauffeur, Vehicule

router = APIRouter(prefix="/api/trajets_custom", tags=["Trajets Custom"])

@router.get("")
def get_trajets_custom(
    statut: Optional[str] = Query(None),
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

    if statut and statut.lower() != "all":
        query = query.filter(Trajet.statut == statut)

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
