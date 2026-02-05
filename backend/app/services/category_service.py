from sqlalchemy.orm import Session
from app.models.models import Category
from app.schemas.category import CategoryCreate


def list_categories(db: Session):
    return db.query(Category).order_by(Category.id).all()


def create_category(db: Session, data: CategoryCreate):
    obj = Category(name=data.name)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj