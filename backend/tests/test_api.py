"""
===========================================================================
BATTERIE DE TESTS EXHAUSTIVE ET SYNCHRONISÉE - TRANSPOBOT v2.1
===========================================================================
Ce fichier valide l'intégralité des fonctionnalités backend en utilisant
une base de données SQLite en mémoire pour garantir l'isolation totale.
===========================================================================
"""
import sys
import os
import pytest
from datetime import date, datetime, timedelta

# Configuration de l'environnement de test AVANT l'import de l'app
os.environ["SECRET_KEY"] = "test-secret-key-super-secure-for-ucad-2026"

# === PATH SETUP ===
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_DIR)

from sqlalchemy import create_engine, StaticPool
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from database import Base, get_db
from app import app
from models import Utilisateur, Chauffeur, Vehicule, Ligne, Trajet, Incident, Maintenance, Tarif
from routers.auth import pwd_context
from routers.chat import is_safe_sql

# ===========================================================================
# DATABASE SETUP : SQLite STRICTEMENT EN MÉMOIRE
# ===========================================================================
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db
client = TestClient(app, raise_server_exceptions=False)

# ===========================================================================
# FIXTURES
# ===========================================================================
@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Charge le schéma et crée l'utilisateur admin."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    admin = Utilisateur(
        username="admin",
        hashed_password=pwd_context.hash("admin123"),
        role="admin"
    )
    db.add(admin)
    db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="module")
def auth_headers():
    """Génère un token JWT valide pour les tests protégés."""
    res = client.post("/api/login", data={"username": "admin", "password": "admin123"})
    assert res.status_code == 200
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

# ===========================================================================
# TEST 1 : HEALTH CHECK (SYNCHRONISÉ v2.1)
# ===========================================================================
class TestHealth:
    def test_health_ok(self):
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "operational"
        assert "version" in data
        assert "TranspoBot" in data["service"]

# ===========================================================================
# TEST 2 : AUTHENTIFICATION
# ===========================================================================
class TestAuthentication:
    def test_login_success(self):
        res = client.post("/api/login", data={"username": "admin", "password": "admin123"})
        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_login_failure(self):
        res = client.post("/api/login", data={"username": "admin", "password": "bad"})
        assert res.status_code == 400

# ===========================================================================
# TEST 3 : SÉCURITÉ SQL (TEXT-TO-SQL)
# ===========================================================================
class TestSQLSafety:
    def test_safe_queries(self):
        assert is_safe_sql("SELECT * FROM vehicules") is True
        assert is_safe_sql("SELECT COUNT(*) FROM trajets WHERE recette > 1000") is True

    def test_unsafe_queries(self):
        assert is_safe_sql("DROP TABLE utilisateurs") is False
        assert is_safe_sql("DELETE FROM chauffeurs") is False
        assert is_safe_sql("UPDATE vehicules SET statut='panne'") is False
        assert is_safe_sql("INSERT INTO tarifs (prix) VALUES (0)") is False
        assert is_safe_sql("SELECT * FROM vehicules; DROP TABLE users") is False
        assert is_safe_sql("SELECT * FROM vehicules UNION SELECT * FROM utilisateurs") is False

# ===========================================================================
# TEST 4 : CRUD COMPLET AVEC DÉPENDANCES
# ===========================================================================
class TestCRUDFull:
    v_id = None
    c_id = None
    l_id = None
    t_id = None

    def test_create_vehicule(self, auth_headers):
        res = client.post("/api/vehicules", json={
            "immatriculation": "DK-TEST-2026",
            "type": "bus",
            "capacite": 60,
            "statut": "actif",
            "kilometrage": 5000,
            "date_acquisition": "2024-01-01"
        }, headers=auth_headers)
        assert res.status_code == 200
        TestCRUDFull.v_id = res.json()["id"]

    def test_create_chauffeur(self, auth_headers):
        res = client.post("/api/chauffeurs", json={
            "nom": "SOW",
            "prenom": "Abdou",
            "telephone": "771234567",
            "numero_permis": "AA-112233",
            "categorie_permis": "D",
            "disponibilite": True,
            "date_embauche": "2023-01-01"
        }, headers=auth_headers)
        assert res.status_code == 200
        TestCRUDFull.c_id = res.json()["id"]

    def test_create_ligne(self, auth_headers):
        res = client.post("/api/lignes", json={
            "code": "L1",
            "nom": "Dakar - Goree",
            "origine": "Dakar",
            "destination": "Goree",
            "distance_km": 5.0,
            "duree_minutes": 30
        }, headers=auth_headers)
        assert res.status_code == 200
        TestCRUDFull.l_id = res.json()["id"]

    def test_create_trajet(self, auth_headers):
        res = client.post("/api/trajets", json={
            "ligne_id": TestCRUDFull.l_id,
            "chauffeur_id": TestCRUDFull.c_id,
            "vehicule_id": TestCRUDFull.v_id,
            "date_heure_depart": datetime.now().isoformat(),
            "statut": "planifie",
            "nb_passagers": 0,
            "recette": 0.0
        }, headers=auth_headers)
        assert res.status_code == 200
        TestCRUDFull.t_id = res.json()["id"]

    def test_create_incident(self, auth_headers):
        res = client.post("/api/incidents", json={
            "trajet_id": TestCRUDFull.t_id,
            "type": "Pneu crevé",
            "description": "Retard de 15min",
            "gravite": "faible",
            "date_incident": datetime.now().isoformat(),
            "resolu": False
        }, headers=auth_headers)
        assert res.status_code == 200

    def test_create_maintenance(self, auth_headers):
        res = client.post("/api/maintenance", json={
            "vehicule_id": TestCRUDFull.v_id,
            "type": "Vidange",
            "description": "Entretien standard",
            "date_prevue": "2024-12-01",
            "cout": 45000,
            "effectuee": False
        }, headers=auth_headers)
        assert res.status_code == 200

    def test_create_tarif(self, auth_headers):
        res = client.post("/api/tarifs", json={
            "ligne_id": TestCRUDFull.l_id,
            "type_client": "Étudiant",
            "prix": 250
        }, headers=auth_headers)
        assert res.status_code == 200
        assert res.json()["prix"] == 250

# ===========================================================================
# TEST 5 : STATISTIQUES (SYNCHRONISÉ v2.1)
# ===========================================================================
class TestStats:
    def test_global_stats(self, auth_headers):
        res = client.get("/api/stats", headers=auth_headers)
        assert res.status_code == 200
        data = res.json()
        # Vérification des nouveaux noms de champs de la version 2.1
        assert "vehicules_actifs" in data
        assert "chauffeurs_disponibles" in data
        assert "recette_jour" in data
        assert "on_time_rate" in data

    def test_stats_charts(self, auth_headers):
        # Test des endpoints pour les graphiques
        res = client.get("/api/stats/vehicle-status", headers=auth_headers)
        assert res.status_code == 200
        assert isinstance(res.json(), list)

        res = client.get("/api/stats/trips-summary", headers=auth_headers)
        assert res.status_code == 200
        assert "total" in res.json()

# ===========================================================================
# TEST 6 : PROTECTION DES ROUTES
# ===========================================================================
class TestRouteProtection:
    @pytest.mark.parametrize("route", [
        "/api/vehicules", "/api/chauffeurs", "/api/trajets", "/api/stats", "/api/lignes", "/api/tarifs"
    ])
    def test_unauthorized(self, route):
        client.cookies.clear()
        res = client.get(route)
        assert res.status_code == 401
