from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date

try:
    from database import get_db
    from models import Maintenance, Vehicule
    import schemas
except ImportError:
    from ..database import get_db
    from ..models import Maintenance, Vehicule
    from .. import schemas

router = APIRouter(prefix="/api/maintenance_custom", tags=["Maintenance Custom"])

@router.get("")
def list_maintenance(
    effectuee: Optional[bool] = Query(None),
    vehicule_id: Optional[int] = Query(None),
    db: Session = Depends(get_db)
):
    """Liste des maintenances enrichies avec infos véhicule."""
    query = db.query(
        Maintenance.id,
        Maintenance.type,
        Maintenance.description,
        Maintenance.date_prevue,
        Maintenance.date_realisee,
        Maintenance.cout,
        Maintenance.effectuee,
        Vehicule.immatriculation,
        Vehicule.type.label("type_vehicule"),
        Vehicule.statut.label("statut_vehicule"),
    ).join(Vehicule, Maintenance.vehicule_id == Vehicule.id)

    if effectuee is not None:
        query = query.filter(Maintenance.effectuee == effectuee)

    if vehicule_id:
        query = query.filter(Maintenance.vehicule_id == vehicule_id)

    results = query.order_by(Maintenance.date_prevue.desc()).all()

    today = date.today()

    return [
        {
            "id": r.id,
            "vehicule": r.immatriculation,
            "type_vehicule": r.type_vehicule,
            "statut_vehicule": r.statut_vehicule,
            "type": r.type,
            "description": r.description,
            "date_prevue": r.date_prevue.isoformat() if r.date_prevue else None,
            "date_realisee": r.date_realisee.isoformat() if r.date_realisee else None,
            "cout": float(r.cout) if r.cout else 0,
            "effectuee": r.effectuee,
            "en_retard": (not r.effectuee and r.date_prevue and r.date_prevue < today),
            "jours_restants": (r.date_prevue - today).days if r.date_prevue and not r.effectuee else None,
        } for r in results
    ]

@router.patch("/{id}/complete")
def complete_maintenance(id: int, db: Session = Depends(get_db)):
    """Marque une maintenance comme effectuée aujourd'hui."""
    m = db.query(Maintenance).filter(Maintenance.id == id).first()
    if not m:
        raise HTTPException(404, "Maintenance non trouvée")
    m.effectuee = True
    m.date_realisee = date.today()
    db.commit()
    return {"ok": True, "id": id, "date_realisee": m.date_realisee.isoformat()}

@router.patch("/{id}")
def update_maintenance(
    id: int,
    data: schemas.MaintenanceUpdate,
    db: Session = Depends(get_db)
):
    """Mise à jour partielle d'une maintenance."""
    m = db.query(Maintenance).filter(Maintenance.id == id).first()
    if not m:
        raise HTTPException(404, "Maintenance non trouvée")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(m, field, value)

    db.commit()
    db.refresh(m)
    return {"ok": True, "id": id}
