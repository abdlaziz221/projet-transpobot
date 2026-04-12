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
        # 1. UTILISATEURS (Roles: admin, manager, driver)
        print("[COHERENCE] Synchronisation des accès...")
        users_to_ensure = [
            {"username": "admin", "pwd": "admin123", "role": "admin"},
            {"username": "aziz",  "pwd": "passer",   "role": "admin"}
        ]
        for u_data in users_to_ensure:
            user = session.query(Utilisateur).filter(Utilisateur.username == u_data["username"]).first()
            if not user:
                user = Utilisateur(
                    username=u_data["username"], 
                    hashed_password=pwd_context.hash(u_data["pwd"]), 
                    role=u_data["role"], 
                    created_at=datetime.datetime.now()
                )
                session.add(user)
            else:
                user.hashed_password = pwd_context.hash(u_data["pwd"])
        session.commit()

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
                chauffeurs_objs.append(c)
            session.add_all(chauffeurs_objs)
            session.flush()
        else:
            chauffeurs_objs = session.query(Chauffeur).all()

        # 4. VÉHICULES (Statuts: actif, maintenance, hors_service)
        if session.query(Vehicule).count() == 0:
            print("[COHERENCE] Initialisation de la flotte (statut: actif)...")
            v_objs = []
            for i in range(1, 26):
                v = Vehicule(
                    immatriculation=f"DK-{random.randint(1000,9999)}-XZ",
                    type=random.choice(["Bus", "Minibus"]),
                    capacite=random.choice([25, 60]),
                    statut="actif",
                    kilometrage=random.randint(5000, 150000),
                    date_acquisition=datetime.date(2023, 1, 1)
                )
                v_objs.append(v)
            session.add_all(v_objs)
            session.flush()
        else:
            v_objs = session.query(Vehicule).all()

        # 5. TRAJETS HISTORIQUES (Statuts: planifie, en_cours, termine, annule)
        if session.query(Trajet).count() < 100:
            print("[COHERENCE] Génération de 500 trajets sans accents...")
            status_trajets = ["termine", "termine", "termine", "en_cours", "planifie", "annule"]
            for i in range(500):
                l = random.choice(lignes_objs)
                v = random.choice(v_objs)
                c = random.choice(chauffeurs_objs)
                stat = random.choice(status_trajets)
                start = datetime.datetime.now() - timedelta(days=random.randint(0, 60))
                session.add(Trajet(
                    ligne_id=l.id, chauffeur_id=c.id, vehicule_id=v.id,
                    date_heure_depart=start, statut=stat, nb_passagers=random.randint(1, v.capacite),
                    recette=random.randint(10000, 200000)
                ))
            session.commit()
        
        # 6. INCIDENTS (Types: Accident, Panne, Retard, Comportement, Sécurité | Gravité: faible, moyen, grave)
        if session.query(Incident).count() == 0:
            print("[COHERENCE] Alignement des incidents (faible/moyen/grave)...")
            trajets = session.query(Trajet).limit(100).all()
            for i in range(40):
                t = random.choice(trajets)
                session.add(Incident(
                    trajet_id=t.id, 
                    type=random.choice(["Accident", "Panne", "Retard", "Comportement", "Sécurité"]),
                    description="Incident automatique simulé pour le dashboard.",
                    gravite=random.choice(["faible", "moyen", "grave"]),
                    date_incident=t.date_heure_depart,
                    resolu=random.random() > 0.5
                ))

        # 7. MAINTENANCE (Type: Vidange, Pneumatiques, Freins, Moteur...)
        if session.query(Maintenance).count() == 0:
            print("[COHERENCE] Génération des maintenances...")
            for i in range(30):
                v = random.choice(v_objs)
                session.add(Maintenance(
                    vehicule_id=v.id,
                    type=random.choice(["Vidange", "Pneumatiques", "Freins", "Moteur"]),
                    description="Contrôle technique périodique.",
                    date_prevue=datetime.date.today() - timedelta(days=random.randint(0, 100)),
                    cout=random.randint(50000, 300000),
                    effectuee=True
                ))

        # 8. AFFECTATIONS (Liens Chauffeurs <-> Véhicules)
        if session.query(Affectation).count() == 0:
            print("[COHERENCE] Création des affectations officielles...")
            for i in range(min(len(chauffeurs_objs), len(v_objs))):
                session.add(Affectation(
                    chauffeur_id=chauffeurs_objs[i].id,
                    vehicule_id=v_objs[i].id,
                    date_debut=datetime.date(2023, 1, 1),
                    date_fin=None
                ))

        session.commit()
        print("[COHERENCE] TERMINÉ. Le système est maintenant 100% cohérent.")

if __name__ == "__main__":
    seed_all()
