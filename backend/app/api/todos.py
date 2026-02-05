from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.deps import get_db
from app.core.logging import get_logger
from app.schemas.todo import TodoCreate, TodoUpdate, TodoResponse
from app.services import todo_service
from app.llm.ali_client import parse_natural_language_to_todo

logger = get_logger(__name__)

router = APIRouter(prefix="/todos", tags=["todos"])


class NaturalLanguageTodoBody(BaseModel):
    text: str


@router.get("", response_model=list[TodoResponse])
def list_todos(
    db: Session = Depends(get_db),
    status: str | None = Query(None),
    priority: str | None = Query(None),
    category_id: int | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    items, _ = todo_service.list_todos(db, status=status, priority=priority, category_id=category_id, limit=limit, offset=offset)
    return items


@router.get("/{todo_id}", response_model=TodoResponse)
def get_todo(todo_id: int, db: Session = Depends(get_db)):
    item = todo_service.get_todo(db, todo_id)
    if not item:
        raise HTTPException(status_code=404, detail="待办不存在")
    return item


@router.post("", response_model=TodoResponse)
def create_todo(data: TodoCreate, db: Session = Depends(get_db)):
    return todo_service.create_todo(db, data)


@router.post("/from-natural-language", response_model=TodoResponse)
def create_todo_from_natural_language(body: NaturalLanguageTodoBody, db: Session = Depends(get_db)):
    """用自然语言描述一句话，由阿里 API 解析为待办字段并创建任务。"""
    try:
        parsed = parse_natural_language_to_todo(body.text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("from-natural-language llm call failed: %s", e)
        raise HTTPException(status_code=502, detail=f"调用解析服务失败: {e}")

    due_date_str = parsed.get("due_date")
    due_date = None
    if due_date_str and isinstance(due_date_str, str):
        try:
            due_date = datetime.strptime(due_date_str.strip()[:10], "%Y-%m-%d").date()
        except ValueError:
            pass
    parsed["due_date"] = due_date

    data = TodoCreate(**parsed)
    return todo_service.create_todo(db, data)


@router.put("/{todo_id}", response_model=TodoResponse)
def update_todo(todo_id: int, data: TodoUpdate, db: Session = Depends(get_db)):
    item = todo_service.update_todo_full(db, todo_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="待办不存在")
    return item


@router.patch("/{todo_id}", response_model=TodoResponse)
def patch_todo(todo_id: int, data: TodoUpdate, db: Session = Depends(get_db)):
    item = todo_service.update_todo_partial(db, todo_id, data)
    if not item:
        raise HTTPException(status_code=404, detail="待办不存在")
    return item


@router.delete("/{todo_id}", status_code=204)
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    ok = todo_service.delete_todo(db, todo_id)
    if not ok:
        raise HTTPException(status_code=404, detail="待办不存在")