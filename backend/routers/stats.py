from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from datetime import datetime, timedelta, date
from typing import List, Dict

try:
    from database import get_db
    from models import Vehicule, Chauffeur, Trajet, Incident, Ligne, Maintenance
except ImportError:
    from ..database import get_db
    from ..models import Vehicule, Chauffeur, Trajet, Incident, Ligne, Maintenance

router = APIRouter(prefix="/api/stats", tags=["Stats"])

@router.get("")
def get_global_stats(db: Session = Depends(get_db)):
    """KPIs pour les cartes du dashboard."""
    vehicules_actifs = db.query(Vehicule).filter(Vehicule.statut == 'actif').count()
    chauffeurs_dispo = db.query(Chauffeur).filter(Chauffeur.disponibilite == True).count()

    today = datetime.now().date()
    trajets_today = db.query(Trajet).filter(func.date(Trajet.date_heure_depart) == today).count()

    incidents_ouverts = db.query(Incident).filter(Incident.resolu == False).count()
    incidents_graves = db.query(Incident).filter(Incident.resolu == False, Incident.gravite == 'grave').count()

    # Recettes du jour — coalesce pour éviter float(None)
    recette_jour = db.query(
        func.coalesce(func.sum(Trajet.recette), 0)
    ).filter(
        Trajet.statut == 'termine',
        func.date(Trajet.date_heure_depart) == today
    ).scalar() or 0

    # Recettes de la semaine
    seven_days_ago = today - timedelta(days=7)
    recette_semaine = db.query(
        func.coalesce(func.sum(Trajet.recette), 0)
    ).filter(
        Trajet.statut == 'termine',
        Trajet.date_heure_depart >= seven_days_ago
    ).scalar() or 0

    # Taux de ponctualité (semaine)
    total_week = db.query(Trajet).filter(Trajet.date_heure_depart >= seven_days_ago).count()
    annulations = db.query(Trajet).filter(
        Trajet.date_heure_depart >= seven_days_ago,
        Trajet.statut == 'annule'
    ).count()
    on_time_rate = round((1 - (annulations / max(total_week, 1))) * 100, 1)

    # Total passagers du mois
    thirty_days_ago = today - timedelta(days=30)
    total_passagers = db.query(
        func.coalesce(func.sum(Trajet.nb_passagers), 0)
    ).filter(
        Trajet.statut == 'termine',
        Trajet.date_heure_depart >= thirty_days_ago
    ).scalar() or 0

    # Maintenances en attente
    maintenances_en_attente = db.query(Maintenance).filter(
        Maintenance.effectuee == False
    ).count()

    return {
        "vehicules_actifs": vehicules_actifs,
        "chauffeurs_disponibles": chauffeurs_dispo,
        "trajets_aujourd_hui": trajets_today,
        "incidents_ouverts": incidents_ouverts,
        "incidents_graves": incidents_graves,
        "recette_jour": float(recette_jour),
        "recette_semaine": float(recette_semaine),
        "on_time_rate": on_time_rate,
        "total_passagers_mois": int(total_passagers),
        "maintenances_en_attente": maintenances_en_attente,
    }

@router.get("/weekly-performance")
def get_weekly_performance(db: Session = Depends(get_db)):
    """Données pour le graphique linéaire (7 derniers jours)."""
    today = datetime.now().date()
    six_days_ago = today - timedelta(days=6)

    results = db.query(
        func.date(Trajet.date_heure_depart).label("jour"),
        func.count(Trajet.id).label("nb_trajets"),
        func.coalesce(
            func.sum(case((Trajet.statut == 'termine', Trajet.recette), else_=0)), 0
        ).label("recette_totale"),
        func.coalesce(
            func.sum(case((Trajet.statut == 'termine', Trajet.nb_passagers), else_=0)), 0
        ).label("nb_passagers")
    ).filter(
        Trajet.date_heure_depart >= six_days_ago
    ).group_by(
        func.date(Trajet.date_heure_depart)
    ).order_by("jour").all()

    return [
        {
            "jour": r.jour.isoformat(),
            "jour_nom": r.jour.strftime("%a %d/%m"),
            "nb_trajets": r.nb_trajets,
            "recette_totale": float(r.recette_totale),
            "nb_passagers": int(r.nb_passagers)
        } for r in results
    ]

@router.get("/vehicle-status")
def get_vehicle_status(db: Session = Depends(get_db)):
    """Répartition par statut pour le doughnut chart."""
    results = db.query(
        Vehicule.statut, func.count(Vehicule.id).label("nb")
    ).group_by(Vehicule.statut).all()
    return [{"statut": r.statut, "nb": r.nb} for r in results]

@router.get("/trips-summary")
def get_trips_summary(db: Session = Depends(get_db)):
    """Résumé des trajets par statut."""
    counts = db.query(
        func.count(Trajet.id).label("total"),
        func.sum(case((Trajet.statut == 'termine', 1), else_=0)).label("termine"),
        func.sum(case((Trajet.statut == 'en_cours', 1), else_=0)).label("en_cours"),
        func.sum(case((Trajet.statut == 'planifie', 1), else_=0)).label("planifie"),
        func.sum(case((Trajet.statut == 'annule', 1), else_=0)).label("annule")
    ).first()

    return {
        "total": counts.total or 0,
        "termine": int(counts.termine or 0),
        "en_cours": int(counts.en_cours or 0),
        "planifie": int(counts.planifie or 0),
        "annule": int(counts.annule or 0)
    }

@router.get("/incidents-ranking")
def get_incidents_ranking(db: Session = Depends(get_db)):
    """Classement des chauffeurs par nombre d'incidents (30 derniers jours)."""
    thirty_days_ago = datetime.now() - timedelta(days=30)

    results = db.query(
        Chauffeur.id,
        func.concat(Chauffeur.prenom, ' ', Chauffeur.nom).label("chauffeur"),
        func.count(Incident.id).label("total"),
        func.sum(case((Incident.gravite == 'grave', 1), else_=0)).label("graves"),
        func.sum(case((Incident.gravite == 'moyen', 1), else_=0)).label("moyens"),
        func.sum(case((Incident.gravite == 'faible', 1), else_=0)).label("faibles")
    ).join(Trajet, Trajet.chauffeur_id == Chauffeur.id)\
     .join(Incident, Incident.trajet_id == Trajet.id)\
     .filter(Incident.date_incident >= thirty_days_ago)\
     .group_by(Chauffeur.id, "chauffeur")\
     .order_by(func.count(Incident.id).desc())\
     .limit(10).all()

    return [
        {
            "id": r.id,
            "chauffeur": r.chauffeur,
            "total": r.total,
            "graves": int(r.graves or 0),
            "moyens": int(r.moyens or 0),
            "faibles": int(r.faibles or 0)
        } for r in results
    ]

@router.get("/revenue-by-line")
def get_revenue_by_line(db: Session = Depends(get_db)):
    """Recettes totales par ligne (30 derniers jours) pour le bar chart."""
    thirty_days_ago = datetime.now() - timedelta(days=30)

    results = db.query(
        Ligne.nom,
        Ligne.code,
        func.count(Trajet.id).label("nb_trajets"),
        func.coalesce(func.sum(Trajet.recette), 0).label("recette_totale"),
        func.coalesce(func.avg(Trajet.nb_passagers), 0).label("moy_passagers")
    ).join(Trajet, Trajet.ligne_id == Ligne.id)\
     .filter(
         Trajet.statut == 'termine',
         Trajet.date_heure_depart >= thirty_days_ago
     )\
     .group_by(Ligne.id, Ligne.nom, Ligne.code)\
     .order_by(func.sum(Trajet.recette).desc())\
     .limit(8).all()

    return [
        {
            "ligne": r.code,
            "nom": r.nom,
            "nb_trajets": r.nb_trajets,
            "recette_totale": float(r.recette_totale),
            "moy_passagers": round(float(r.moy_passagers), 1)
        } for r in results
    ]

@router.get("/maintenance-alerts")
def get_maintenance_alerts(db: Session = Depends(get_db)):
    """Véhicules nécessitant une maintenance urgente (< 14 jours)."""
    today = date.today()
    alert_date = today + timedelta(days=14)

    results = db.query(
        Maintenance.id,
        Maintenance.type,
        Maintenance.description,
        Maintenance.date_prevue,
        Maintenance.cout,
        Vehicule.immatriculation,
        Vehicule.type.label("type_vehicule")
    ).join(Vehicule, Vehicule.id == Maintenance.vehicule_id)\
     .filter(
         Maintenance.effectuee == False,
         Maintenance.date_prevue <= alert_date
     )\
     .order_by(Maintenance.date_prevue).all()

    return [
        {
            "id": r.id,
            "vehicule": r.immatriculation,
            "type_vehicule": r.type_vehicule,
            "type_maintenance": r.type,
            "description": r.description,
            "date_prevue": r.date_prevue.isoformat(),
            "cout": float(r.cout),
            "jours_restants": (r.date_prevue - today).days
        } for r in results
    ]

@router.get("/incidents-by-type")
def get_incidents_by_type(db: Session = Depends(get_db)):
    """Répartition des incidents par type pour le doughnut chart incidents."""
    results = db.query(
        Incident.type,
        func.count(Incident.id).label("nb")
    ).group_by(Incident.type).all()
    return [{"type": r.type, "nb": r.nb} for r in results]
