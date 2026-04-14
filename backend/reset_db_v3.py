import sys
import os

# Ajout du chemin pour importer les modules locaux
sys.path.append(os.path.dirname(__file__))

from database import engine, Base
from seeder import seed_all
from sqlalchemy.orm import Session
from sqlalchemy import text

def reset_and_seed():
    print("--- RÉINITIALISATION TRANSPOBOT V3 ---")
    
    try:
        # 1. Suppression forcée des tables existantes
        print("[1/3] Nettoyage de la base de données...")
        with engine.connect() as conn:
            # Désactivation temporaire des clés étrangères pour le DROP
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
            
            # Récupération de toutes les tables
            res = conn.execute(text("SHOW TABLES;"))
            tables = [row[0] for row in res]
            
            for table in tables:
                print(f"      Suppression de {table}...")
                conn.execute(text(f"DROP TABLE IF EXISTS `{table}`;"))
            
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
            conn.commit()
        print("[OK] Base de données nettoyée.")

        # 2. Création de la nouvelle structure via SQLAlchemy
        print("[2/3] Création de la structure selon le nouveau schéma...")
        from models import (
            Utilisateur, Vehicule, Chauffeur, Ligne, 
            Trajet, Incident, Maintenance, Planning, Tarif, Affectation
        )
        Base.metadata.create_all(bind=engine)
        print("[OK] Structure créée.")

        # 3. Exécution du Seeder pour injecter l'utilisateur aziz et les données Sénégal
        print("[3/3] Injection des données (Utilisateur 'aziz', Flotte Sénégal)...")
        seed_all()
        print("[OK] Seeding terminé.")
        
        print("\n--- OPÉRATION RÉUSSIE ---")
        print("Identifiants de test :")
        print("- Utilisateur : aziz")
        print("- Mot de passe : passer")
        print("- Role : admin")

    except Exception as e:
        print(f"\n[ERREUR CRITIQUE] : {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    reset_and_seed()
