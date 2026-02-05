import time
import uuid
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from sqlalchemy.exc import OperationalError

from app.api import categories, todos
from app.config import settings
from app.core.logging import get_logger, request_id_ctx

# 前端静态目录：本地为项目根/frontend，Docker 为 /app/frontend
_root = Path(__file__).resolve().parent.parent  # backend/app -> backend 或 /app
_FRONTEND_DIR = _root.parent / "frontend"  # 项目根/frontend（本地）
if not _FRONTEND_DIR.is_dir():
    _FRONTEND_DIR = _root / "frontend"  # Docker：/app/frontend

app = FastAPI(title="待办事项管理平台", version="0.1.0")
logger = get_logger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RequestIdAndLoggingMiddleware(BaseHTTPMiddleware):
    """为每个请求生成/透传 request_id，并记录请求与响应日志（含耗时）。"""
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        token = request_id_ctx.set(request_id)
        start = time.perf_counter()
        try:
            logger.info("request started %s %s", request.method, request.url.path)
            response = await call_next(request)
            duration_ms = (time.perf_counter() - start) * 1000
            logger.info(
                "request finished %s %s %s %.2fms",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
            )
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception as e:
            duration_ms = (time.perf_counter() - start) * 1000
            logger.exception(
                "request failed %s %s %.2fms: %s",
                request.method,
                request.url.path,
                duration_ms,
                e,
            )
            raise
        finally:
            request_id_ctx.reset(token)


app.add_middleware(RequestIdAndLoggingMiddleware)


@app.exception_handler(OperationalError)
async def db_operational_error_handler(request: Request, exc: OperationalError):
    """数据库连接/执行失败时返回 503，便于前端提示。"""
    logger.exception("database error: %s", exc)
    return JSONResponse(
        status_code=503,
        content={"detail": "数据库连接失败，请检查 DATABASE_URL 或数据库服务是否可用。"},
    )


@app.exception_handler(RuntimeError)
async def runtime_error_handler(request: Request, exc: RuntimeError):
    """如 DATABASE_URL 未配置等。"""
    if "DATABASE_URL" in str(exc):
        logger.warning("config error: %s", exc)
        return JSONResponse(
            status_code=503,
            content={"detail": "数据库未配置，请在 backend/.env 中设置 DATABASE_URL。"},
        )
    raise exc


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(categories.router)
app.include_router(todos.router)

# 静态前端：API 未匹配的请求由前端静态文件处理（同域代理，无需单独起前端服务）
if _FRONTEND_DIR.is_dir():
    app.mount("/", StaticFiles(directory=str(_FRONTEND_DIR), html=True), name="frontend")
