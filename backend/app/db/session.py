from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.config import settings

# 仅当配置了 DATABASE_URL 时才创建引擎，避免未配库时启动报错
engine = None
SessionLocal = None
Base = declarative_base()

if getattr(settings, "DATABASE_URL", None):
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        echo=False,  # 开发时可改为 True 看 SQL
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """供 FastAPI Depends 注入，请求结束时关闭 session。"""
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL 未配置，无法使用数据库")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()