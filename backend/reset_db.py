import sys
import os

try:
    from database import engine, Base
    from models import *
    from seeder import seed_data
except ImportError:
    sys.path.append(os.getcwd())
    from database import engine, Base
    from models import *
    from seeder import seed_data

def reset_and_seed():
    print("--- RESETTING DATABASE V3 ---")
    Base.metadata.drop_all(bind=engine)
    print("[OK] Tables supprimées.")
    Base.metadata.create_all(bind=engine)
    print("[OK] Tables recréées avec le schéma complet.")
    
    from sqlalchemy.orm import Session
    from database import SessionLocal
    db = SessionLocal()
    try:
        seed_data(db)
        print("[OK] Données initiales insérées.")
    finally:
        db.close()

if __name__ == "__main__":
    reset_and_seed()
