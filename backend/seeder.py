import datetime
import random
from datetime import timedelta
from sqlalchemy.orm import Session
from database import engine
from models import (
    Utilisateur, Vehicule, Chauffeur, Ligne, 
    Trajet, Incident, Maintenance, Tarif, Affectation
)
from routers.auth import pwd_context

def seed_all():
    with Session(engine) as session:
        # 1. UTILISATEURS (Unique Admin)
        admin_exists = session.query(Utilisateur).filter_by(username="admin").first()
        if not admin_exists:
            print("[COHERENCE] Création de l'admin unique...")
            admin_user = Utilisateur(
                username="admin", 
                hashed_password=pwd_context.hash("passer"), 
                role="admin", 
                created_at=datetime.datetime.now()
            )
            session.add(admin_user)
            session.commit()
        else:
            print("[COHERENCE] Admin déjà présent.")

        # 2. LIGNES
        if session.query(Ligne).count() == 0:
            print("[COHERENCE] Création des lignes...")
            villes = ["Dakar", "Thiès", "Mbour", "Saint-Louis", "Touba", "Kaolack", "Ziguinchor", "Tambacounda", "Kolda", "Fatick"]
            lignes_objs = []
            for i in range(1, 16):
                orig = random.choice(villes)
                dest = random.choice([v for v in villes if v != orig])
                dist = random.randint(30, 450)
                l = Ligne(code=f"L{i:02d}", nom=f"{orig} - {dest}", origine=orig, destination=dest, distance_km=dist, duree_minutes=int(dist * 1.5))
                lignes_objs.append(l)
            session.add_all(lignes_objs)
            session.flush()
        else:
            lignes_objs = session.query(Ligne).all()

        # 3. CHAUFFEURS
        if session.query(Chauffeur).count() == 0:
            print("[COHERENCE] Recrutement des chauffeurs...")
            n_list = ["DIOP", "FALL", "NDIAYE", "SARR", "SY", "BA", "FAYE", "GUEYE", "TOURE", "SOW"]
            p_list = ["Mamadou", "Ibrahima", "Fatou", "Ousmane", "Aminata", "Assane", "Awa", "Aliou"]
            chauffeurs_objs = []
            for i in range(1, 41):
                c = Chauffeur(
                    nom=random.choice(n_list), 
                    prenom=random.choice(p_list), 
                    telephone=f"+22177{random.randint(1000000,9999999)}",
                    numero_permis=f"P-SN-{i:03d}", 
                    categorie_permis="D", 
                    disponibilite=True, 
                    date_embauche=datetime.date(2022, 1, 1)
                )
                session.add(c)
                chauffeurs_objs.append(c)
            session.commit()
        else:
            chauffeurs_objs = session.query(Chauffeur).all()

        # 4. VEHICULES
        if session.query(Vehicule).count() == 0:
            print("[COHERENCE] Préparation de la flotte...")
            types = [("Bus", 70), ("Minibus", 35), ("Express", 50)]
            v_objs = []
            for i in range(1, 31):
                vt, cap = random.choice(types)
                v = Vehicule(
                    immatriculation=f"DK-{random.randint(1000,9999)}-BC",
                    type=vt, 
                    capacite=cap, 
                    statut=random.choice(['actif', 'actif', 'actif', 'maintenance', 'inactif']),
                    kilometrage=random.randint(10000, 250000),
                    date_acquisition=datetime.date(2021, 1, 1)
                )
                v_objs.append(v)
            session.add_all(v_objs)
            session.commit()
        else:
            v_objs = session.query(Vehicule).all()

        # 5. TARIFS
        if session.query(Tarif).count() == 0:
            print("Mise à jour de la grille tarifaire...")
            today = datetime.date.today()
            year_end = datetime.date(today.year, 12, 31)
            for l in lignes_objs:
                session.add(Tarif(
                    ligne_id=l.id, 
                    type_client="Plein tarif", 
                    prix=5000,
                    date_debut=today,
                    date_fin=year_end
                ))
                session.add(Tarif(
                    ligne_id=l.id, 
                    type_client="Étudiant", 
                    prix=3500,
                    date_debut=today,
                    date_fin=year_end
                ))
            session.commit()

        # 6. TRAJETS (Big Data Simulation)
        if session.query(Trajet).count() < 100:
            print("Simulation de l'historique des trajets (500+)...")
            for i in range(500):
                l = random.choice(lignes_objs)
                v = random.choice(v_objs)
                c = random.choice(chauffeurs_objs)
                d = datetime.datetime.now() - timedelta(days=random.randint(0, 90))
                session.add(Trajet(
                    ligne_id=l.id, chauffeur_id=c.id, vehicule_id=v.id,
                    date_heure_depart=d, date_heure_arrivee=d + timedelta(minutes=l.duree_minutes),
                    statut="termine", nb_passagers=random.randint(10, 70), recette=random.randint(15000, 150000)
                ))
            session.commit()

        # 7. INCIDENTS
        if session.query(Incident).count() == 0:
            print("Génération des rapports d'incidents...")
            trajets = session.query(Trajet).limit(40).all()
            for t in trajets:
                session.add(Incident(
                    trajet_id=t.id, type=random.choice(["Panne Moteur", "Accident mineur", "Retard important", "Problème Pneu"]),
                    description="Incident survenu durant le trajet de routine.",
                    gravite=random.choice(["faible", "moyen", "grave"]),
                    date_incident=t.date_heure_depart, resolu=random.choice([True, False])
                ))

        # 8. MAINTENANCE
        if session.query(Maintenance).count() == 0:
            print("Génération du journal de maintenance...")
            for i in range(30):
                v = random.choice(v_objs)
                session.add(Maintenance(
                    vehicule_id=v.id,
                    type=random.choice(["Vidange", "Pneumatiques", "Freins", "Moteur"]),
                    description="Contrôle technique périodique.",
                    date_prevue=datetime.date.today() - timedelta(days=random.randint(0, 100)),
                    cout=random.randint(50000, 300000),
                    kilometrage=v.kilometrage + random.randint(-5000, 0),
                    effectuee=True
                ))

        # 9. AFFECTATIONS
        if session.query(Affectation).count() == 0:
            print("Assignation des chauffeurs aux véhicules...")
            for i in range(min(len(chauffeurs_objs), len(v_objs))):
                session.add(Affectation(
                    chauffeur_id=chauffeurs_objs[i].id,
                    vehicule_id=v_objs[i].id,
                    date_debut=datetime.date(2023, 1, 1),
                    date_fin=None
                ))

        session.commit()
        print("Fin de l'initialisation des données.")

if __name__ == "__main__":
    seed_all()
