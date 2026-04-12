from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatReq(BaseModel):
    question: str
    history: List[ChatMessage] = []

# ─────────────────────────────────── VEHICULES ───────────────────────────────────
class VehiculeBase(BaseModel):
    immatriculation: str
    type: str
    capacite: int
    statut: str
    kilometrage: int
    date_acquisition: date

class Vehicule(VehiculeBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class VehiculeUpdate(BaseModel):
    """Schéma pour PATCH partiel — tous les champs sont optionnels."""
    immatriculation: Optional[str] = None
    type: Optional[str] = None
    capacite: Optional[int] = None
    statut: Optional[str] = None
    kilometrage: Optional[int] = None
    date_acquisition: Optional[date] = None

# ─────────────────────────────────── CHAUFFEURS ───────────────────────────────────
class ChauffeurBase(BaseModel):
    nom: str
    prenom: str
    telephone: str
    numero_permis: str
    categorie_permis: str
    disponibilite: bool
    date_embauche: date

class Chauffeur(ChauffeurBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class ChauffeurUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    telephone: Optional[str] = None
    disponibilite: Optional[bool] = None
    categorie_permis: Optional[str] = None

# ─────────────────────────────────── LIGNES ───────────────────────────────────
class LigneBase(BaseModel):
    code: str
    nom: str
    origine: str
    destination: str
    distance_km: float
    duree_minutes: int

class Ligne(LigneBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────── TRAJETS ───────────────────────────────────
class TrajetBase(BaseModel):
    ligne_id: int
    chauffeur_id: int
    vehicule_id: int
    date_heure_depart: datetime
    date_heure_arrivee: Optional[datetime] = None
    statut: str
    nb_passagers: int
    recette: Optional[float] = None

class Trajet(TrajetBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────── INCIDENTS ───────────────────────────────────
class IncidentBase(BaseModel):
    trajet_id: int
    type: str
    description: str
    gravite: str
    date_incident: datetime
    resolu: bool

class Incident(IncidentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class IncidentUpdate(BaseModel):
    """Schéma pour PATCH partiel d'un incident."""
    type: Optional[str] = None
    description: Optional[str] = None
    gravite: Optional[str] = None
    resolu: Optional[bool] = None

# ─────────────────────────────────── MAINTENANCE ───────────────────────────────────
class MaintenanceBase(BaseModel):
    vehicule_id: int
    type: str
    description: str
    date_prevue: date
    date_realisee: Optional[date] = None
    cout: float
    effectuee: bool

class Maintenance(MaintenanceBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class MaintenanceUpdate(BaseModel):
    type: Optional[str] = None
    description: Optional[str] = None
    date_prevue: Optional[date] = None
    date_realisee: Optional[date] = None
    cout: Optional[float] = None
    effectuee: Optional[bool] = None

# ─────────────────────────────────── AFFECTATIONS ───────────────────────────────────
class AffectationBase(BaseModel):
    chauffeur_id: int
    vehicule_id: int
    date_debut: date
    date_fin: Optional[date] = None

class Affectation(AffectationBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────── PLANNINGS ───────────────────────────────────
class PlanningBase(BaseModel):
    ligne_id: int
    chauffeur_id: int
    vehicule_id: int
    date_heure_depart_prevue: datetime
    date_heure_arrivee_prevue: Optional[datetime] = None
    statut: str

class Planning(PlanningBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# ─────────────────────────────────── TARIFS ───────────────────────────────────
class TarifBase(BaseModel):
    ligne_id: int
    type_client: str
    prix: float

class Tarif(TarifBase):
    id: int
    model_config = ConfigDict(from_attributes=True)
