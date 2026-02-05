# 待办事项管理平台 - 前端

根据《待办事项管理平台-技术方案.md》编写的单页前端，用于与 FastAPI 后端交互。无构建步骤，可直接用浏览器或静态服务器打开。

## 功能

- **待办列表**：展示所有待办，支持状态（待办/进行中/已完成）、优先级、截止日期、分类
- **新建 / 编辑待办**：弹窗表单，标题、描述、状态、优先级、截止日期、分类
- **删除待办**：单条删除，带确认
- **快捷完成**：列表内一键标记「完成」或「未完成」
- **分类**：侧栏展示分类列表，支持新建分类；可按分类筛选待办
- **筛选**：按状态、优先级、分类组合筛选；支持重置

## 如何运行

### 1. 直接打开（会有跨域限制）

双击 `index.html` 用浏览器打开。此时请求 `http://localhost:8000` 会因跨域被拦截，仅在后端配置了 CORS 且后端已启动时才能正常用。

### 2. 用本地静态服务器（推荐）

在 `frontend` 目录下执行其一即可：

```bash
# Python 3
python -m http.server 3000

# 或（若已安装 uv）
uv run python -m http.server 3000
```

浏览器访问：**http://localhost:3000**

### 3. 后端需同时运行

前端会请求 **http://localhost:8000** 的接口。请先按技术方案启动 FastAPI，例如：

```bash
uv run uvicorn app.main:app --reload
```

若后端未启动或端口不同，页面会提示「无法连接后端」，并说明需启动 FastAPI 及跨域配置。

## 修改后端地址

在 `app.js` 顶部修改：

```javascript
const API_BASE = 'http://localhost:8000';
```

改成你的后端地址（含端口，不要带末尾斜杠）。

## 与后端接口约定

前端按技术方案中的接口设计调用，约定如下：

| 方法   | 路径              | 说明         |
|--------|-------------------|--------------|
| GET    | /todos            | 待办列表     |
| GET    | /todos/{id}       | 单条详情     |
| POST   | /todos            | 创建待办     |
| PUT    | /todos/{id}       | 全量更新     |
| PATCH  | /todos/{id}       | 部分更新     |
| DELETE | /todos/{id}       | 删除         |
| GET    | /categories       | 分类列表     |
| POST   | /categories       | 创建分类     |

- **待办**：`id`, `title`, `description`, `status`, `priority`, `due_date`, `category_id`（可选 `category_name` 用于展示）
- **状态**：`pending` | `in_progress` | `done`
- **优先级**：`low` | `medium` | `high`
- **分类**：`id`, `name`

若后端字段名或枚举值与上述不一致，可在 `app.js` 中做一层映射适配。

## 文件说明

- `index.html`：页面结构
- `styles.css`：样式
- `app.js`：接口调用与页面逻辑
- `README.md`：本说明
