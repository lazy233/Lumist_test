# 在项目根目录构建，镜像内包含 backend + frontend，供 ECS 部署
# 使用：docker build -t lumist:latest -f Dockerfile .

FROM python:3.12-slim

WORKDIR /app

# 安装 uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# 后端依赖
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

# 后端代码
COPY backend/app ./app
COPY backend/scripts ./scripts

# 前端静态（FastAPI 会挂载到 /，见 app.main 中 _FRONTEND_DIR）
COPY frontend ./frontend

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
