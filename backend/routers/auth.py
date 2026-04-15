import os
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta, datetime, timezone
from jose import jwt
from passlib.context import CryptContext
from slowapi import Limiter
from slowapi.util import get_remote_address

try:
    from ..database import get_db
    from ..models import Utilisateur
    from ..schemas import Token
    from ..deps import SECRET_KEY, ALGORITHM, get_current_user
except ImportError:
    from database import get_db
    from models import Utilisateur
    from schemas import Token
    from deps import SECRET_KEY, ALGORITHM, get_current_user

router = APIRouter(prefix="/api", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"])
ACCESS_TOKEN_EXPIRE_MINUTES = 60

limiter = Limiter(key_func=get_remote_address)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta if expires_delta else timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@router.post("/login", response_model=Token)
@limiter.limit("20/minute")
def login(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    print(f"[VERBOSE_AUTH] Tentative pour : '{form_data.username}'")
    
    user = db.query(Utilisateur).filter(Utilisateur.username == form_data.username).first()
    
    if not user:
        print(f"[VERBOSE_AUTH] Erreur : Utilisateur '{form_data.username}' introuvable en base.")
        raise HTTPException(status_code=400, detail="Identifiants incorrects (U)")
        
    # Vérification du mot de passe avec log du hash pour debug industriel
    try:
        is_valid = pwd_context.verify(form_data.password, user.hashed_password)
        if not is_valid:
            print(f"[VERBOSE_AUTH] Erreur : Le mot de passe ne correspond pas pour '{form_data.username}'.")
            # En mode debug "dégradé" demandé par l'user, on pourrait afficher plus, mais restons prudents
            raise HTTPException(status_code=400, detail="Identifiants incorrects (P)")
    except Exception as e:
        print(f"[VERBOSE_AUTH] Erreur système lors de la vérification : {e}")
        raise HTTPException(status_code=500, detail="Erreur interne de hachage")

    print(f"[VERBOSE_AUTH] Succès : '{form_data.username}' connecté avec succès.")
    
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    # Cookie HttpOnly pour la persistance (secure=True en production HTTPS)
    is_prod = os.getenv("ENVIRONMENT", "development") == "production"
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        expires=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=is_prod,
    )
    
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("access_token")
    return {"detail": "Déconnexion réussie"}

@router.get("/me")
def read_users_me(current_user: Utilisateur = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "username": current_user.username,
        "role": current_user.role
    }
