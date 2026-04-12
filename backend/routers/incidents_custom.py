from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

try:
    from database import get_db
    from models import Incident, Trajet, Chauffeur, Vehicule, Ligne
    import schemas
except ImportError:
    from ..database import get_db
    from ..models import Incident, Trajet, Chauffeur, Vehicule, Ligne
    from .. import schemas

router = APIRouter(prefix="/api/incidents_custom", tags=["Incidents Custom"])

@router.get("")
def list_incidents(
    gravite: Optional[str] = Query(None),
    resolu: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Liste des incidents enrichis avec infos chauffeur et ligne."""
    query = db.query(
        Incident.id,
        Incident.type,
        Incident.description,
        Incident.gravite,
        Incident.date_incident,
        Incident.resolu,
        Incident.trajet_id,
        Chauffeur.nom.label("chauffeur_nom"),
        Chauffeur.prenom.label("chauffeur_prenom"),
        Vehicule.immatriculation.label("vehicule"),
        Ligne.code.label("ligne_code"),
        Ligne.nom.label("ligne_nom"),
    ).join(Trajet, Incident.trajet_id == Trajet.id)\
     .join(Chauffeur, Trajet.chauffeur_id == Chauffeur.id)\
     .join(Vehicule, Trajet.vehicule_id == Vehicule.id)\
     .join(Ligne, Trajet.ligne_id == Ligne.id)

    if gravite and gravite.lower() != "all":
        query = query.filter(Incident.gravite == gravite)

    if resolu is not None:
        query = query.filter(Incident.resolu == resolu)

    total = query.count()

    results = query.order_by(Incident.date_incident.desc())\
                   .offset((page - 1) * limit)\
                   .limit(limit).all()

    return {
        "total": total,
        "data": [
            {
                "id": r.id,
                "type": r.type,
                "description": r.description,
                "gravite": r.gravite,
                "date_incident": r.date_incident.isoformat() if r.date_incident else None,
                "resolu": r.resolu,
                "trajet_id": r.trajet_id,
                "chauffeur": f"{r.chauffeur_prenom} {r.chauffeur_nom}",
                "vehicule": r.vehicule,
                "ligne": r.ligne_code,
                "ligne_nom": r.ligne_nom,
            } for r in results
        ]
    }

@router.patch("/{id}/resolve")
def resolve_incident(id: int, db: Session = Depends(get_db)):
    """Marque un incident comme résolu — endpoint dédié."""
    incident = db.query(Incident).filter(Incident.id == id).first()
    if not incident:
        raise HTTPException(404, "Incident non trouvé")
    if incident.resolu:
        return {"ok": True, "message": "Incident déjà résolu", "id": id}
    incident.resolu = True
    db.commit()
    return {"ok": True, "id": id, "message": "Incident marqué comme résolu"}

@router.patch("/{id}")
def update_incident(
    id: int,
    data: schemas.IncidentUpdate,
    db: Session = Depends(get_db)
):
    """Mise à jour partielle d'un incident."""
    incident = db.query(Incident).filter(Incident.id == id).first()
    if not incident:
        raise HTTPException(404, "Incident non trouvé")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(incident, field, value)

    db.commit()
    db.refresh(incident)
    return {"ok": True, "id": id}
