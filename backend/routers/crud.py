from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Type, Any

try:
    from ..database import get_db
    from ..deps import get_current_user
    from ..models import Utilisateur
except ImportError:
    from database import get_db
    from deps import get_current_user
    from models import Utilisateur

def create_crud_router(
    model: Type[Any], 
    schema_response: Type[Any], 
    schema_create: Type[Any], 
    prefix: str,
    tags: List[str]
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=tags)

    @router.get("", response_model=List[schema_response])
    def read_all(db: Session = Depends(get_db), current_user: Utilisateur = Depends(get_current_user)):
        return db.query(model).all()

    @router.post("", response_model=schema_response)
    def create_item(item: schema_create, db: Session = Depends(get_db), current_user: Utilisateur = Depends(get_current_user)):
        db_item = model(**item.model_dump())
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item

    @router.put("/{item_id}", response_model=schema_response)
    def update_item(item_id: int, item: schema_create, db: Session = Depends(get_db), current_user: Utilisateur = Depends(get_current_user)):
        db_item = db.query(model).filter(model.id == item_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail="Item not found")
        for key, value in item.model_dump().items():
            setattr(db_item, key, value)
        db.commit()
        db.refresh(db_item)
        return db_item

    @router.delete("/{item_id}")
    def delete_item(item_id: int, db: Session = Depends(get_db), current_user: Utilisateur = Depends(get_current_user)):
        db_item = db.query(model).filter(model.id == item_id).first()
        if not db_item:
            raise HTTPException(status_code=404, detail="Item not found")
        db.delete(db_item)
        db.commit()
        return {"ok": True}

    return router
