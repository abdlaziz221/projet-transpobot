from fastapi import APIRouter, Depends, HTTPException

try:
    from database import get_db
    from models import Ligne
    from sqlalchemy.orm import Session
except ImportError:
    from ..database import get_db
    from ..models import Ligne
    from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/lignes_custom", tags=["Lignes Custom"])


@router.patch("/{id}/toggle-statut")
def toggle_statut(id: int, db: Session = Depends(get_db)):
    """Bascule le statut actif/inactif d'une ligne."""
    ligne = db.query(Ligne).filter(Ligne.id == id).first()
    if not ligne:
        raise HTTPException(404, "Ligne non trouvée")
    ligne.statut = 'inactif' if ligne.statut == 'actif' else 'actif'
    db.commit()
    return {"id": id, "statut": ligne.statut}
