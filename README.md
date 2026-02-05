# 实习生 · 每日任务与 OKR

## 本地启动（不用 Docker，用 uv）

1. 进入后端目录并配置环境：
   ```bash
   cd backend
   copy .env.example .env
   ```
   编辑 `.env`，填写 PostgreSQL 的 `DATABASE_URL`（本地需先安装并建库，可执行 `scripts/init_db.sql` 建表）。

2. 用 uv 启动后端（会同时挂载前端静态页，同域代理，无需单独起前端）：
   ```bash
   uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. 浏览器打开 **http://localhost:8000** 即可使用。

更多说明见 [backend/README.md](backend/README.md)。
