import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# 1. Récupération de l'URL de connexion (Priorité au Cloud)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Mode Local XAMPP
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_HOST = os.getenv("DB_HOST", "host.docker.internal")
    DB_NAME = os.getenv("DB_NAME", "transpobot")
    
    # Construction propre pour gérer le mot de passe vide
    pass_part = f":{DB_PASSWORD}" if DB_PASSWORD else ""
    DATABASE_URL = f"mysql+pymysql://{DB_USER}{pass_part}@{DB_HOST}/{DB_NAME}?charset=utf8mb4"
else:
    # Correction pour Railway (parfois l'URL commence par mysql:// au lieu de mysql+pymysql://)
    if DATABASE_URL.startswith("mysql://"):
        DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)

engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,
    pool_pre_ping=True
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
