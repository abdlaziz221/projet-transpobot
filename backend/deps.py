from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
import os

try:
    from .database import get_db
    from .models import Utilisateur
except ImportError:
    from database import get_db
    from models import Utilisateur

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    # En développement, on pourrait tolérer une clé par défaut, 
    # mais pour une application "Industrialisée", on préfère échouer tôt.
    raise RuntimeError("SECRET_KEY environment variable is not set!")
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login", auto_error=False)

def get_current_user(request: Request, db: Session = Depends(get_db)):
    # On cherche le token partout pour être infaillible
    token = request.headers.get("Authorization")
    if token and token.startswith("Bearer "):
        token = token.split(" ")[1]
    
    if not token:
        token = request.cookies.get("access_token")
    
    # Fallback sur un header perso si besoin
    if not token:
        token = request.headers.get("X-Access-Token")
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token invalide ou expiré",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(Utilisateur).filter(Utilisateur.username == username).first()
    if user is None:
        raise credentials_exception
    return user
