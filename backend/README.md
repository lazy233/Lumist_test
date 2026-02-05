# 后端（FastAPI）

## 本地启动（不用 Docker，用 uv）

1. **安装 uv**（若未安装）  
   https://github.com/astral-sh/uv#installation

2. **配置数据库**  
   - 本地需有 PostgreSQL，并创建库（如 `todo_db`）  
   - 复制环境变量：`cp .env.example .env`  
   - 编辑 `.env`，填写 `DATABASE_URL=postgresql://用户:密码@localhost:5432/库名`  
   - 首次可执行 `scripts/init_db.sql` 建表

3. **在项目根目录下、backend 同级有 frontend 目录时**  
   后端会自动挂载前端静态页，访问同一端口即可（前端通过同域代理，无需单独起前端服务）。

4. **启动**（在 `backend` 目录下执行）  
   ```bash
   uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

5. 浏览器打开 **http://localhost:8000** 即可看到前端页面，API 为同域（如 `/todos`、`/categories`）。

## Docker 方式

见仓库内 `docker-compose.yml` 与 `Dockerfile`（可选）。
