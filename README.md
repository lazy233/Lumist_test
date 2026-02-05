# Lumist 每日任务与 OKR

## 一键部署（Docker，含数据库）

在项目根目录执行：

```bash
# 首次运行：没有 backend/.env 时先复制（Docker 下无需再改）
cp backend/.env.example backend/.env

# 启动数据库 + API（会先起 db，健康后再起 api）
docker compose up -d --build
```

访问：**http://服务器IP:8082**

---

本地开发（不用 Docker）：见 `backend/README.md`。
