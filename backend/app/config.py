import os
from pathlib import Path

# 加载项目根目录的 .env（backend/.env）
_env_path = Path(__file__).resolve().parent.parent / ".env"
if _env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(_env_path)


class Settings:
    """从环境变量读取配置，带默认值。"""
    def __init__(self):
        self.DEBUG = os.getenv("DEBUG", "false").lower() in ("1", "true", "yes")
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
        self.DATABASE_URL = os.getenv("DATABASE_URL", "")
        self.BAILIAN_API_KEY = os.getenv("BAILIAN_API_KEY", "")
        # 阿里云百炼（DashScope）兼容 OpenAI 接口，用于自然语言解析等
        self.ALI_API_KEY = os.getenv("BAILIAN_API_KEY") or os.getenv("OPENAI_API_KEY") or ""
        self.ALI_BASE_URL = os.getenv("ALI_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1")
        self.ALI_MODEL = os.getenv("ALI_MODEL", "qwen-turbo")
        # CORS 允许的源，逗号分隔，如 "https://your-domain.com,https://www.your-domain.com"
        _origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
        self.CORS_ORIGINS = [x.strip() for x in _origins.split(",") if x.strip()]


settings = Settings()