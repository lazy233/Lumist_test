"""
统一日志模块：项目内通过 get_logger(__name__) 获取 logger，不在各处 print。
支持 request_id：中间件设置后，本请求内所有日志自动带 request_id。
"""
import logging
import sys
from contextvars import ContextVar
from typing import Any

from app.config import settings

# 当前请求的 request_id，由中间件设置
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    """为每条 LogRecord 注入 request_id（从 contextvars 读取）。"""
    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = request_id_ctx.get()
        return True


def get_logger(name: str) -> logging.Logger:
    """
    获取带统一配置的 logger。各模块使用 get_logger(__name__)。
    日志格式：时间 [request_id] 级别 模块名: 消息
    """
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    formatter = logging.Formatter(
        "%(asctime)s [%(request_id)s] %(levelname)s %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logger.addFilter(RequestIdFilter())
    return logger
