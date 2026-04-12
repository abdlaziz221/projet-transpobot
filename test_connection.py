# test_connection.py
from dotenv import load_dotenv
import os
import mysql.connector

load_dotenv()

print("🔍 Lecture du fichier .env...")
print(f"DB_HOST: {os.getenv('DB_HOST')}")
print(f"DB_USER: {os.getenv('DB_USER')}")
print(f"DB_NAME: {os.getenv('DB_NAME')}")
print(f"DB_PASSWORD: {'*' * len(os.getenv('DB_PASSWORD', ''))} (masqué)")

try:
    conn = mysql.connector.connect(
        host=os.getenv("DB_HOST"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        database=os.getenv("DB_NAME")
    )
    print("\n✅ Connexion MySQL réussie !")
    conn.close()
except Exception as e:
    print(f"\n❌ Erreur de connexion MySQL: {e}")