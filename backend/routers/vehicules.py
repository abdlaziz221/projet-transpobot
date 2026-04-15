from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

try:
    from database import get_db
    from models import Vehicule, Maintenance, Trajet
    import schemas
except ImportError:
    from ..database import get_db
    from ..models import Vehicule, Maintenance, Trajet
    from .. import schemas

router = APIRouter(prefix="/api/vehicules_custom", tags=["Vehicules Custom"])

@router.get("")
def get_vehicules(statut: Optional[str] = Query(None), db: Session = Depends(get_db)):
    """Liste des véhicules avec date de dernière maintenance."""
    query = db.query(Vehicule)

    if statut and statut.lower() != "all":
        query = query.filter(Vehicule.statut == statut)

    vehicules = query.order_by(Vehicule.id).all()
    results = []

    for v in vehicules:
        # Dernière maintenance effectuée
        last_m = db.query(Maintenance.date_realisee).filter(
            Maintenance.vehicule_id == v.id,
            Maintenance.effectuee == True
        ).order_by(Maintenance.date_realisee.desc()).first()

        # Prochaine maintenance planifiée
        next_m = db.query(Maintenance.date_prevue, Maintenance.type).filter(
            Maintenance.vehicule_id == v.id,
            Maintenance.effectuee == False
        ).order_by(Maintenance.date_prevue.asc()).first()

        # Nombre de trajets du véhicule
        nb_trajets = db.query(func.count(Trajet.id)).filter(
            Trajet.vehicule_id == v.id
        ).scalar() or 0

        results.append({
            "id": v.id,
            "immatriculation": v.immatriculation,
            "type": v.type,
            "capacite": v.capacite,
            "statut": v.statut,
            "kilometrage": v.kilometrage,
            "date_acquisition": v.date_acquisition.isoformat() if v.date_acquisition else None,
            "derniere_maintenance": last_m[0].isoformat() if last_m and last_m[0] else None,
            "prochaine_maintenance": next_m[0].isoformat() if next_m and next_m[0] else None,
            "type_prochaine_maint": next_m[1] if next_m else None,
            "nb_trajets": nb_trajets,
        })

    return results

@router.get("/{id}")
def get_vehicule_detail(id: int, db: Session = Depends(get_db)):
    """Détail d'un véhicule avec historique maintenances et statistiques réelles."""
    v = db.query(Vehicule).filter(Vehicule.id == id).first()
    if not v:
        raise HTTPException(404, "Véhicule non trouvé")

    # Historique complet des maintenances
    maintenances = db.query(Maintenance).filter(
        Maintenance.vehicule_id == id
    ).order_by(Maintenance.date_prevue.desc()).all()

    # Stats réelles depuis la DB
    stats_result = db.query(
        func.count(Trajet.id).label("nb_trajets"),
        func.coalesce(func.sum(Trajet.recette), 0).label("recette_totale"),
        func.coalesce(func.sum(Trajet.nb_passagers), 0).label("nb_passagers"),
        func.coalesce(func.avg(Trajet.nb_passagers), 0).label("moy_passagers")
    ).filter(
        Trajet.vehicule_id == id,
        Trajet.statut == 'termine'
    ).first()

    # Sérialisation des maintenances
    maint_list = [
        {
            "id": m.id,
            "type": m.type,
            "description": m.description,
            "date_prevue": m.date_prevue.isoformat() if m.date_prevue else None,
            "date_realisee": m.date_realisee.isoformat() if m.date_realisee else None,
            "cout": float(m.cout) if m.cout else 0,
            "effectuee": m.effectuee
        } for m in maintenances
    ]

    return {
        "vehicule": {
            "id": v.id,
            "immatriculation": v.immatriculation,
            "type": v.type,
            "capacite": v.capacite,
            "statut": v.statut,
            "kilometrage": v.kilometrage,
            "date_acquisition": v.date_acquisition.isoformat() if v.date_acquisition else None,
        },
        "maintenances": maint_list,
        "stats": {
            "trajets_total": stats_result.nb_trajets or 0,
            "recette_totale": float(stats_result.recette_totale or 0),
            "nb_passagers": int(stats_result.nb_passagers or 0),
            "moy_passagers": round(float(stats_result.moy_passagers or 0))
        }
    }

@router.patch("/{id}")
def update_vehicule(
    id: int,
    data: schemas.VehiculeUpdate,
    db: Session = Depends(get_db)
):
    """Mise à jour partielle d'un véhicule (PATCH)."""
    v = db.query(Vehicule).filter(Vehicule.id == id).first()
    if not v:
        raise HTTPException(404, "Véhicule non trouvé")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(v, field, value)

    db.commit()
    db.refresh(v)

    return {
        "ok": True,
        "id": v.id,
        "immatriculation": v.immatriculation,
        "statut": v.statut
    }
