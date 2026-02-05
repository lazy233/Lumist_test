from sqlalchemy.orm import Session
from app.models.models import TodoItem, Category
from app.schemas.todo import TodoCreate, TodoUpdate
from app.core.logging import get_logger

logger = get_logger(__name__)


def list_todos(db: Session, status=None, priority=None, category_id=None, limit=100, offset=0):
    q = db.query(TodoItem)
    if status:
        q = q.filter(TodoItem.status == status)
    if priority:
        q = q.filter(TodoItem.priority == priority)
    if category_id is not None:
        q = q.filter(TodoItem.category_id == category_id)
    total = q.count()
    rows = q.order_by(TodoItem.id.desc()).offset(offset).limit(limit).all()
    # 手动挂上 category_name 供 Pydantic 序列化
    out = []
    for r in rows:
        d = {
            "id": r.id, "title": r.title, "description": r.description,
            "status": r.status, "priority": r.priority, "due_date": r.due_date,
            "category_id": r.category_id, "created_at": r.created_at, "updated_at": r.updated_at,
        }
        d["category_name"] = r.category.name if r.category else None
        out.append(d)
    return out, total


def get_todo(db: Session, todo_id: int):
    row = db.query(TodoItem).filter(TodoItem.id == todo_id).first()
    if not row:
        return None
    return {
        "id": row.id, "title": row.title, "description": row.description,
        "status": row.status, "priority": row.priority, "due_date": row.due_date,
        "category_id": row.category_id, "category_name": row.category.name if row.category else None,
        "created_at": row.created_at, "updated_at": row.updated_at,
    }


def create_todo(db: Session, data: TodoCreate):
    obj = TodoItem(
        title=data.title,
        description=data.description,
        status=data.status,
        priority=data.priority,
        due_date=data.due_date,
        category_id=data.category_id,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    logger.info("todo created id=%s title=%s", obj.id, obj.title)
    return _row_to_response(db, obj)


def _row_to_response(db: Session, row: TodoItem):
    db.refresh(row)
    cat = db.query(Category).filter(Category.id == row.category_id).first() if row.category_id else None
    return {
        "id": row.id, "title": row.title, "description": row.description,
        "status": row.status, "priority": row.priority, "due_date": row.due_date,
        "category_id": row.category_id, "category_name": cat.name if cat else None,
        "created_at": row.created_at, "updated_at": row.updated_at,
    }


def update_todo_full(db: Session, todo_id: int, data: TodoUpdate):
    row = db.query(TodoItem).filter(TodoItem.id == todo_id).first()
    if not row:
        return None
    row.title = data.title or row.title
    row.description = data.description if data.description is not None else row.description
    row.status = data.status or row.status
    row.priority = data.priority or row.priority
    row.due_date = data.due_date if data.due_date is not None else row.due_date
    row.category_id = data.category_id if data.category_id is not None else row.category_id
    db.commit()
    db.refresh(row)
    return _row_to_response(db, row)


def update_todo_partial(db: Session, todo_id: int, data: TodoUpdate):
    row = db.query(TodoItem).filter(TodoItem.id == todo_id).first()
    if not row:
        return None
    if data.title is not None:
        row.title = data.title
    if data.description is not None:
        row.description = data.description
    if data.status is not None:
        row.status = data.status
    if data.priority is not None:
        row.priority = data.priority
    if data.due_date is not None:
        row.due_date = data.due_date
    if data.category_id is not None:
        row.category_id = data.category_id
    db.commit()
    db.refresh(row)
    return _row_to_response(db, row)


def delete_todo(db: Session, todo_id: int) -> bool:
    row = db.query(TodoItem).filter(TodoItem.id == todo_id).first()
    if not row:
        return False
    db.delete(row)
    db.commit()
    return True