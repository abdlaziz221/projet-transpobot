from sqlalchemy import Column, Integer, String, Boolean, Float, Date, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
try:
    from .database import Base
except ImportError:
    from database import Base

class Utilisateur(Base):
    __tablename__ = "utilisateurs"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum('admin', 'manager', 'driver', name='user_roles'), default='manager')
    created_at = Column(DateTime)

class Vehicule(Base):
    __tablename__ = "vehicules"
    id = Column(Integer, primary_key=True, index=True)
    immatriculation = Column(String(50))
    type = Column(String(50))
    capacite = Column(Integer)
    statut = Column(String(50))
    kilometrage = Column(Integer)
    date_acquisition = Column(Date)
    
    maintenances = relationship("Maintenance", back_populates="vehicule")
    affectations = relationship("Affectation", back_populates="vehicule")
    trajets = relationship("Trajet", back_populates="vehicule")

class Chauffeur(Base):
    __tablename__ = "chauffeurs"
    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(100))
    prenom = Column(String(100))
    telephone = Column(String(20))
    numero_permis = Column(String(50))
    categorie_permis = Column(String(10))
    disponibilite = Column(Boolean)
    date_embauche = Column(Date)

    affectations = relationship("Affectation", back_populates="chauffeur")
    trajets = relationship("Trajet", back_populates="chauffeur")

class Ligne(Base):
    __tablename__ = "lignes"
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(20))
    nom = Column(String(100))
    origine = Column(String(100))
    destination = Column(String(100))
    distance_km = Column(Float)
    duree_minutes = Column(Integer)

    trajets = relationship("Trajet", back_populates="ligne")
    tarifs = relationship("Tarif", back_populates="ligne")

class Affectation(Base):
    __tablename__ = "affectations"
    id = Column(Integer, primary_key=True, index=True)
    chauffeur_id = Column(Integer, ForeignKey("chauffeurs.id"))
    vehicule_id = Column(Integer, ForeignKey("vehicules.id"))
    date_debut = Column(Date)
    date_fin = Column(Date, nullable=True)

    chauffeur = relationship("Chauffeur", back_populates="affectations")
    vehicule = relationship("Vehicule", back_populates="affectations")

class Trajet(Base):
    __tablename__ = "trajets"
    id = Column(Integer, primary_key=True, index=True)
    ligne_id = Column(Integer, ForeignKey("lignes.id"))
    chauffeur_id = Column(Integer, ForeignKey("chauffeurs.id"))
    vehicule_id = Column(Integer, ForeignKey("vehicules.id"))
    date_heure_depart = Column(DateTime)
    date_heure_arrivee = Column(DateTime, nullable=True)
    statut = Column(String(50))
    nb_passagers = Column(Integer)
    recette = Column(Float, nullable=True)

    ligne = relationship("Ligne", back_populates="trajets")
    chauffeur = relationship("Chauffeur", back_populates="trajets")
    vehicule = relationship("Vehicule", back_populates="trajets")
    incidents = relationship("Incident", back_populates="trajet")

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True, index=True)
    trajet_id = Column(Integer, ForeignKey("trajets.id"))
    type = Column(String(50))
    description = Column(String(255))
    gravite = Column(String(50))
    date_incident = Column(DateTime)
    resolu = Column(Boolean)

    trajet = relationship("Trajet", back_populates="incidents")

class Maintenance(Base):
    __tablename__ = "maintenance"
    id = Column(Integer, primary_key=True, index=True)
    vehicule_id = Column(Integer, ForeignKey("vehicules.id"))
    type = Column(String(50))
    description = Column(String(255))
    date_prevue = Column(Date)
    date_realisee = Column(Date, nullable=True)
    cout = Column(Float)
    kilometrage = Column(Integer)
    effectuee = Column(Boolean)

    vehicule = relationship("Vehicule", back_populates="maintenances")

class Planning(Base):
    __tablename__ = "plannings"
    id = Column(Integer, primary_key=True, index=True)
    ligne_id = Column(Integer, ForeignKey("lignes.id"))
    chauffeur_id = Column(Integer, ForeignKey("chauffeurs.id"))
    vehicule_id = Column(Integer, ForeignKey("vehicules.id"))
    date_heure_depart_prevue = Column(DateTime)
    date_heure_arrivee_prevue = Column(DateTime, nullable=True)
    statut = Column(String(50))

class Tarif(Base):
    __tablename__ = "tarifs"
    id = Column(Integer, primary_key=True, index=True)
    ligne_id = Column(Integer, ForeignKey("lignes.id"))
    type_client = Column(String(50))
    prix = Column(Float)
    date_debut = Column(Date)
    date_fin = Column(Date)

    ligne = relationship("Ligne", back_populates="tarifs")
