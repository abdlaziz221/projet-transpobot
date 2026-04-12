import os
import sys
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from sqlalchemy.exc import SQLAlchemyError
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Ensure backend directory is in path
sys.path.append(os.path.dirname(__file__))

from database import engine, Base
from deps import get_current_user
import schemas
from routers import auth, chat, crud, stats, vehicules, chauffeurs, trajets
from routers import incidents_custom, maintenance_custom

# Models for auto-schema creation
from models import (
    Vehicule, Chauffeur, Ligne, Affectation,
    Trajet, Incident, Maintenance, Planning, Tarif
)

# Initialize Database Schema & Initial Data
try:
    Base.metadata.create_all(bind=engine)
    
    print("[OK] Connexion à la base de données établie.")
    
    # SEEDING INDUSTRIEL AUTOMATIQUE
    try:
        from seeder import seed_all
        seed_all()
    except Exception as e:
        print(f"[ERROR] Échec du seeding : {e}")

    print("[OK] Système prêt (Infrastucture & Données métiers).")
except Exception as err:
    print(f"[ERROR] CRITICAL: Échec de l'initialisation système : {err}")
    # On ne crash pas le container pour pouvoir livre les logs

app = FastAPI(
    title="TranspoBot - Système de Gestion",
    description="Application de gestion de flotte et d'exploitation du réseau de transport.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# --- MIDDLEWARES D'OPTIMISATION ---

# Compression Gzip pour les réponses volumineuses (Stats, Listes)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Rate Limiting setup
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Configuration CORS dynamique
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    # CSP assoupli pour le développement si nécessaire, mais strict par défaut
    CSP_VAL = os.getenv("CSP_HEADER", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' *;")
    response.headers["Content-Security-Policy"] = CSP_VAL
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# ── Core Routes (publiques) ──
app.include_router(auth.router)
app.include_router(chat.router)

# ── Routes protégées par JWT ──
protected = [Depends(get_current_user)]

app.include_router(stats.router, dependencies=protected)
app.include_router(vehicules.router, dependencies=protected)
app.include_router(chauffeurs.router, dependencies=protected)
app.include_router(trajets.router, dependencies=protected)
app.include_router(incidents_custom.router, dependencies=protected)
app.include_router(maintenance_custom.router, dependencies=protected)

# ── CRUD Générique Auto-généré (admin) ──
crud_configs = [
    (Vehicule,     schemas.Vehicule,     schemas.VehiculeBase,     "/api/vehicules",     ["Vehicules"]),
    (Chauffeur,    schemas.Chauffeur,    schemas.ChauffeurBase,    "/api/chauffeurs",    ["Chauffeurs"]),
    (Ligne,        schemas.Ligne,        schemas.LigneBase,        "/api/lignes",        ["Lignes"]),
    (Trajet,       schemas.Trajet,       schemas.TrajetBase,       "/api/trajets",       ["Trajets"]),
    (Incident,     schemas.Incident,     schemas.IncidentBase,     "/api/incidents",     ["Incidents"]),
    (Affectation,  schemas.Affectation,  schemas.AffectationBase,  "/api/affectations",  ["Affectations"]),
    (Planning,     schemas.Planning,     schemas.PlanningBase,     "/api/plannings",     ["Plannings"]),
    (Maintenance,  schemas.Maintenance,  schemas.MaintenanceBase,  "/api/maintenance",   ["Maintenance"]),
    (Tarif,        schemas.Tarif,        schemas.TarifBase,        "/api/tarifs",        ["Tarifs"]),
]

for model, schema, base_schema, prefix, tags in crud_configs:
    app.include_router(
        crud.create_crud_router(model, schema, base_schema, prefix, tags),
        dependencies=protected
    )

@app.get("/health", tags=["System"])
async def health_check():
    """Vérifie l'état de santé de l'API."""
    return {
        "status": "operational",
        "version": "3.0.0",
        "service": "TranspoBot Enterprise API (Optimized)"
    }

if __name__ == "__main__":
    import uvicorn
    # Utilisation de reload uniquement en dev
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
