from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional

try:
    from database import get_db
    from models import Chauffeur, Trajet, Incident, Affectation, Vehicule
    import schemas
except ImportError:
    from ..database import get_db
    from ..models import Chauffeur, Trajet, Incident, Affectation, Vehicule
    from .. import schemas

router = APIRouter(prefix="/api/chauffeurs_custom", tags=["Chauffeurs Custom"])

@router.get("")
def get_chauffeurs(dispo: Optional[bool] = Query(None), db: Session = Depends(get_db)):
    """Liste des chauffeurs avec véhicule assigné et stats de base."""
    query = db.query(Chauffeur)
    if dispo is not None:
        query = query.filter(Chauffeur.disponibilite == dispo)

    chauffeurs = query.order_by(Chauffeur.nom).all()
    results = []

    for c in chauffeurs:
        # Véhicule actuel (affectation active = date_fin IS NULL)
        v = db.query(Vehicule.immatriculation, Vehicule.type).join(
            Affectation, Vehicule.id == Affectation.vehicule_id
        ).filter(
            Affectation.chauffeur_id == c.id,
            Affectation.date_fin == None
        ).first()

        # Nombre de trajets total
        nb_trajets = db.query(func.count(Trajet.id)).filter(
            Trajet.chauffeur_id == c.id
        ).scalar() or 0

        # Nombre d'incidents
        nb_incidents = db.query(func.count(Incident.id)).join(
            Trajet, Incident.trajet_id == Trajet.id
        ).filter(Trajet.chauffeur_id == c.id).scalar() or 0

        results.append({
            "id": c.id,
            "nom": c.nom,
            "prenom": c.prenom,
            "telephone": c.telephone,
            "licence": c.numero_permis,
            "categorie_permis": c.categorie_permis,
            "disponibilite": c.disponibilite,
            "date_embauche": c.date_embauche.isoformat() if c.date_embauche else None,
            "vehicule_actuel": v[0] if v else "Non assigné",
            "type_vehicule": v[1] if v else None,
            "nb_trajets": nb_trajets,
            "nb_incidents": nb_incidents,
        })

    return results

@router.get("/{id}")
def get_chauffeur_detail(id: int, db: Session = Depends(get_db)):
    """Détail complet d'un chauffeur avec stats et historique."""
    c = db.query(Chauffeur).filter(Chauffeur.id == id).first()
    if not c:
        raise HTTPException(404, "Chauffeur non trouvé")

    # Stats agrégées
    stats = db.query(
        func.count(Trajet.id).label("total_trips"),
        func.coalesce(func.sum(Trajet.recette), 0).label("total_revenue"),
        func.coalesce(func.sum(Trajet.nb_passagers), 0).label("total_passengers"),
        func.coalesce(func.avg(Trajet.nb_passagers), 0).label("avg_passengers")
    ).filter(
        Trajet.chauffeur_id == id,
        Trajet.statut == 'termine'
    ).first()

    incidents = db.query(func.count(Incident.id)).join(
        Trajet, Incident.trajet_id == Trajet.id
    ).filter(Trajet.chauffeur_id == id).scalar() or 0

    incidents_graves = db.query(func.count(Incident.id)).join(
        Trajet, Incident.trajet_id == Trajet.id
    ).filter(
        Trajet.chauffeur_id == id,
        Incident.gravite == 'grave'
    ).scalar() or 0

    # Véhicule actuel
    v = db.query(Vehicule.immatriculation, Vehicule.type).join(
        Affectation, Vehicule.id == Affectation.vehicule_id
    ).filter(
        Affectation.chauffeur_id == id,
        Affectation.date_fin == None
    ).first()

    # 5 derniers trajets
    last_trips = db.query(Trajet).filter(
        Trajet.chauffeur_id == id
    ).order_by(Trajet.date_heure_depart.desc()).limit(5).all()

    last_trips_list = [
        {
            "id": t.id,
            "statut": t.statut,
            "date": t.date_heure_depart.isoformat() if t.date_heure_depart else None,
            "nb_passagers": t.nb_passagers,
            "recette": float(t.recette) if t.recette else 0
        } for t in last_trips
    ]

    return {
        "chauffeur": {
            "id": c.id,
            "nom": c.nom,
            "prenom": c.prenom,
            "telephone": c.telephone,
            "numero_permis": c.numero_permis,
            "categorie_permis": c.categorie_permis,
            "disponibilite": c.disponibilite,
            "date_embauche": c.date_embauche.isoformat() if c.date_embauche else None,
        },
        "vehicule_actuel": v[0] if v else "Non assigné",
        "stats": {
            "trips": stats.total_trips or 0,
            "revenue": float(stats.total_revenue or 0),
            "passengers": int(stats.total_passengers or 0),
            "avg_passengers": round(float(stats.avg_passengers or 0), 1),
            "incidents": incidents,
            "incidents_graves": incidents_graves,
        },
        "last_trips": last_trips_list
    }

@router.patch("/{id}")
def update_chauffeur(
    id: int,
    data: schemas.ChauffeurUpdate,
    db: Session = Depends(get_db)
):
    """Mise à jour partielle d'un chauffeur."""
    c = db.query(Chauffeur).filter(Chauffeur.id == id).first()
    if not c:
        raise HTTPException(404, "Chauffeur non trouvé")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(c, field, value)

    db.commit()
    db.refresh(c)
    return {"ok": True, "id": c.id, "disponibilite": c.disponibilite}
