/**
 * 实习生 · 每日任务与 OKR - 前端
 * 每日任务对接 FastAPI：/todos、/categories
 * OKR 使用 localStorage，供实习生本人记录目标与关键结果
 */

// ========== 配置：后端 API 地址（与 FastAPI 一致） ==========
// 本地/同域代理（FastAPI 直接挂载静态页）: '' 即可
// 前后端不同域: 改为后端完整地址，如 'http://localhost:8000' 或 'https://api.example.com'
const API_BASE = '';
const OKR_STORAGE_KEY = 'intern_okr';

// ========== API 请求封装 ==========
async function api(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text();
    let errMsg = text;
    try {
      const j = JSON.parse(text);
      errMsg = j.detail || j.message || text;
    } catch (_) {}
    throw new Error(errMsg);
  }
  const contentType = res.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

const apiGet = (path) => api(path, { method: 'GET' });
const apiPost = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });
const apiPut = (path, body) => api(path, { method: 'PUT', body: JSON.stringify(body) });
const apiPatch = (path, body) => api(path, { method: 'PATCH', body: JSON.stringify(body) });
const apiDelete = (path) => api(path, { method: 'DELETE' });

// ========== DOM 元素 ==========
const el = {
  apiStatus: document.getElementById('api-status'),
  todoList: document.getElementById('todo-list'),
  categoryList: document.getElementById('category-list'),
  formTodo: document.getElementById('form-todo'),
  formAddCategory: document.getElementById('form-add-category'),
  modalTodo: document.getElementById('modal-todo'),
  modalTitle: document.getElementById('modal-title'),
  todoId: document.getElementById('todo-id'),
  todoTitle: document.getElementById('todo-title'),
  todoDescription: document.getElementById('todo-description'),
  todoStatus: document.getElementById('todo-status'),
  todoPriority: document.getElementById('todo-priority'),
  todoDueDate: document.getElementById('todo-due-date'),
  todoCategory: document.getElementById('todo-category'),
  inputCategoryName: document.getElementById('input-category-name'),
  filterStatus: document.getElementById('filter-status'),
  filterPriority: document.getElementById('filter-priority'),
  filterCategory: document.getElementById('filter-category'),
  btnNewTodo: document.getElementById('btn-new-todo'),
  btnCancelTodo: document.getElementById('btn-cancel-todo'),
  btnResetFilter: document.getElementById('btn-reset-filter'),
  inputNaturalLanguage: document.getElementById('input-natural-language'),
  btnNaturalLanguageTodo: document.getElementById('btn-natural-language-todo'),
  // OKR
  viewDaily: document.getElementById('view-daily'),
  viewOkr: document.getElementById('view-okr'),
  okrList: document.getElementById('okr-list'),
  okrPeriod: document.getElementById('okr-period'),
  btnNewObjective: document.getElementById('btn-new-objective'),
  modalObjective: document.getElementById('modal-objective'),
  formObjective: document.getElementById('form-objective'),
  objectiveId: document.getElementById('objective-id'),
  objectiveTitle: document.getElementById('objective-title'),
  modalObjectiveTitle: document.getElementById('modal-objective-title'),
  btnCancelObjective: document.getElementById('btn-cancel-objective'),
  modalKr: document.getElementById('modal-kr'),
  formKr: document.getElementById('form-kr'),
  krObjectiveId: document.getElementById('kr-objective-id'),
  krContent: document.getElementById('kr-content'),
  btnCancelKr: document.getElementById('btn-cancel-kr'),
};

// ========== 状态 ==========
let categories = [];
let todos = [];
let selectedCategoryId = '';
let objectives = []; // OKR：{ id, title, keyResults: [ { id, content, done } ] }

// ========== 提示信息 ==========
function showApiStatus(message, type = 'error') {
  el.apiStatus.textContent = message;
  el.apiStatus.className = 'api-status ' + type;
  el.apiStatus.style.display = 'block';
}

function hideApiStatus() {
  el.apiStatus.style.display = 'none';
}

// ========== 分类 ==========
function renderCategories() {
  const list = categories.map((c) => {
    const active = selectedCategoryId === String(c.id) ? ' active' : '';
    return `<li data-id="${c.id}" class="${active}">${escapeHtml(c.name)}</li>`;
  }).join('');
  el.categoryList.innerHTML = list || '<li class="empty">暂无分类</li>';

  // 下拉框：筛选、表单
  const options = categories.map((c) =>
    `<option value="${c.id}">${escapeHtml(c.name)}</option>`
  ).join('');
  const filterCat = el.filterCategory;
  const formCat = el.todoCategory;
  const currentFilter = filterCat.value;
  const currentForm = formCat.value;
  filterCat.innerHTML = '<option value="">全部分类</option>' + options;
  formCat.innerHTML = '<option value="">无</option>' + options;
  filterCat.value = currentFilter || '';
  formCat.value = currentForm || '';
}

async function loadCategories() {
  try {
    const data = await apiGet('/categories');
    categories = Array.isArray(data) ? data : (data.items || data.data || []);
    renderCategories();
    return true;
  } catch (e) {
    categories = [];
    renderCategories();
    return false;
  }
}

async function createCategory(name) {
  await apiPost('/categories', { name: name.trim() });
  await loadCategories();
}

// ========== 待办 ==========
function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function formatDate(str) {
  if (!str) return '';
  try {
    const d = new Date(str);
    return d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', year: 'numeric' });
  } catch (_) {
    return str;
  }
}

function statusLabel(s) {
  const map = { pending: '待办', in_progress: '进行中', done: '已完成' };
  return map[s] || s;
}

function priorityLabel(p) {
  const map = { low: '低', medium: '中', high: '高' };
  return map[p] || p;
}

function applyFilters(list) {
  let result = list;
  const status = el.filterStatus.value;
  const priority = el.filterPriority.value;
  const categoryId = el.filterCategory.value;
  if (status) result = result.filter((t) => t.status === status);
  if (priority) result = result.filter((t) => t.priority === priority);
  if (categoryId) result = result.filter((t) => String(t.category_id) === categoryId);
  return result;
}

function renderTodos() {
  const filtered = applyFilters(todos);
  if (filtered.length === 0) {
    el.todoList.innerHTML = '<div class="empty-state">暂无任务，点击「新建任务」添加</div>';
    return;
  }
  el.todoList.innerHTML = filtered.map((t) => {
    const statusClass = t.status || 'pending';
    const priorityClass = t.priority || 'medium';
    const desc = t.description ? escapeHtml(t.description).slice(0, 60) + (t.description.length > 60 ? '…' : '') : '';
    return `
      <div class="todo-item ${statusClass === 'done' ? 'done' : ''}" data-id="${t.id}">
        <div class="todo-item-main">
          <div class="todo-item-title">${escapeHtml(t.title)}</div>
          ${desc ? `<div class="todo-item-meta">${desc}</div>` : ''}
          <div class="todo-item-meta">
            <span class="badge badge-${statusClass}">${statusLabel(statusClass)}</span>
            <span class="badge badge-${priorityClass}">${priorityLabel(priorityClass)}</span>
            ${t.due_date ? `<span>截止 ${formatDate(t.due_date)}</span>` : ''}
            ${t.category_name ? `<span>${escapeHtml(t.category_name)}</span>` : ''}
          </div>
        </div>
        <div class="todo-item-actions">
          <button type="button" data-action="edit" data-id="${t.id}">编辑</button>
          <button type="button" data-action="toggle" data-id="${t.id}">${statusClass === 'done' ? '未完成' : '完成'}</button>
          <button type="button" class="btn-danger" data-action="delete" data-id="${t.id}">删除</button>
        </div>
      </div>
    `;
  }).join('');
}

function onTodoListClick(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (action === 'edit') openTodoModal(id);
  if (action === 'toggle') toggleTodoStatus(id);
  if (action === 'delete') deleteTodo(id);
}

async function loadTodos() {
  try {
    const data = await apiGet('/todos');
    todos = Array.isArray(data) ? data : (data.items || data.data || []);
    renderTodos();
    hideApiStatus();
    return true;
  } catch (e) {
    todos = [];
    renderTodos();
    showApiStatus('无法连接后端：' + e.message + '。请确认 FastAPI 已启动（如 uv run uvicorn app.main:app --reload）并允许跨域。', 'error');
    return false;
  }
}

function openTodoModal(id) {
  if (id) {
    el.modalTitle.textContent = '编辑任务';
    el.todoId.value = id;
    const t = todos.find((x) => String(x.id) === String(id));
    if (t) {
      el.todoTitle.value = t.title || '';
      el.todoDescription.value = t.description || '';
      el.todoStatus.value = t.status || 'pending';
      el.todoPriority.value = t.priority || 'medium';
      el.todoDueDate.value = t.due_date ? t.due_date.slice(0, 10) : '';
      el.todoCategory.value = t.category_id != null ? t.category_id : '';
    }
  } else {
    el.modalTitle.textContent = '新建任务';
    el.todoId.value = '';
    el.formTodo.reset();
    el.todoStatus.value = 'pending';
    el.todoPriority.value = 'medium';
    el.todoCategory.value = '';
  }
  el.modalTodo.hidden = false;
}

function closeTodoModal() {
  el.modalTodo.hidden = true;
}

async function submitTodo(e) {
  e.preventDefault();
  const id = el.todoId.value;
  const payload = {
    title: el.todoTitle.value.trim(),
    description: el.todoDescription.value.trim() || null,
    status: el.todoStatus.value,
    priority: el.todoPriority.value,
    due_date: el.todoDueDate.value || null,
    category_id: el.todoCategory.value ? parseInt(el.todoCategory.value, 10) : null,
  };
  try {
    if (id) {
      await apiPut(`/todos/${id}`, payload);
      showApiStatus('已更新', 'success');
    } else {
      await apiPost('/todos', payload);
      showApiStatus('已创建', 'success');
    }
    closeTodoModal();
    await loadTodos();
    setTimeout(hideApiStatus, 2000);
  } catch (err) {
    showApiStatus('保存失败：' + err.message, 'error');
  }
}

async function toggleTodoStatus(id) {
  const t = todos.find((x) => String(x.id) === String(id));
  if (!t) return;
  const nextStatus = t.status === 'done' ? 'pending' : 'done';
  try {
    await apiPatch(`/todos/${id}`, { status: nextStatus });
    showApiStatus(nextStatus === 'done' ? '已标记完成' : '已标记未完成', 'success');
    await loadTodos();
    setTimeout(hideApiStatus, 1500);
  } catch (err) {
    showApiStatus('更新失败：' + err.message, 'error');
  }
}

async function deleteTodo(id) {
  if (!confirm('确定删除这条待办？')) return;
  try {
    await apiDelete(`/todos/${id}`);
    showApiStatus('已删除', 'success');
    await loadTodos();
    setTimeout(hideApiStatus, 1500);
  } catch (err) {
    showApiStatus('删除失败：' + err.message, 'error');
  }
}

// ========== 筛选 ==========
function onFilterChange() {
  renderTodos();
}

function resetFilter() {
  el.filterStatus.value = '';
  el.filterPriority.value = '';
  el.filterCategory.value = '';
  selectedCategoryId = '';
  renderCategories();
  renderTodos();
}

// ========== 标签切换：每日任务 | 我的 OKR ==========
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    const t = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach((x) => x.classList.remove('active'));
    tab.classList.add('active');
    el.viewDaily.classList.remove('view-active');
    el.viewOkr.classList.remove('view-active');
    if (t === 'daily') {
      el.viewDaily.classList.add('view-active');
    } else {
      el.viewOkr.classList.add('view-active');
      loadOkr();
      renderOkrList();
    }
  });
});

// ========== 我的 OKR（本地存储） ==========
function loadOkr() {
  try {
    const raw = localStorage.getItem(OKR_STORAGE_KEY);
    objectives = raw ? JSON.parse(raw) : [];
  } catch (_) {
    objectives = [];
  }
}

function saveOkr() {
  localStorage.setItem(OKR_STORAGE_KEY, JSON.stringify(objectives));
  renderOkrList();
}

function nextId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
}

function renderOkrList() {
  if (!el.okrList) return;
  if (objectives.length === 0) {
    el.okrList.innerHTML = `
      <div class="okr-empty">
        <p>还没有目标，点击「新建目标（O）」开始记录本周期 OKR。</p>
        <p>每个目标下可添加多条关键结果（KR），用于衡量目标完成情况。</p>
      </div>
    `;
    return;
  }
  el.okrList.innerHTML = objectives.map((o) => {
    const krs = (o.keyResults || []).map((kr) => `
      <li class="okr-kr-item ${kr.done ? 'done' : ''}" data-o-id="${o.id}" data-kr-id="${kr.id}">
        <input type="checkbox" ${kr.done ? 'checked' : ''} data-action="kr-toggle" data-o-id="${o.id}" data-kr-id="${kr.id}" />
        <span class="kr-content">${escapeHtml(kr.content)}</span>
        <button type="button" class="kr-delete" data-action="kr-delete" data-o-id="${o.id}" data-kr-id="${kr.id}">删除</button>
      </li>
    `).join('');
    return `
      <div class="okr-card" data-o-id="${o.id}">
        <div class="okr-card-header">
          <span class="objective-title">${escapeHtml(o.title)}</span>
          <div class="okr-card-actions">
            <button type="button" class="btn-add-kr" data-action="add-kr" data-o-id="${o.id}">+ KR</button>
            <button type="button" data-action="edit-o" data-o-id="${o.id}">编辑</button>
            <button type="button" class="btn-danger" data-action="delete-o" data-o-id="${o.id}">删除</button>
          </div>
        </div>
        <ul class="okr-kr-list">${krs || '<li class="okr-kr-item" style="color:var(--text-muted);font-size:12px;">暂无关键结果，点击 + KR 添加</li>'}</ul>
      </div>
    `;
  }).join('');

  el.okrList.querySelectorAll('[data-action="add-kr"]').forEach((btn) => {
    btn.addEventListener('click', () => openKrModal(btn.dataset.oId));
  });
  el.okrList.querySelectorAll('[data-action="edit-o"]').forEach((btn) => {
    btn.addEventListener('click', () => openObjectiveModal(btn.dataset.oId));
  });
  el.okrList.querySelectorAll('[data-action="delete-o"]').forEach((btn) => {
    btn.addEventListener('click', () => deleteObjective(btn.dataset.oId));
  });
  el.okrList.querySelectorAll('[data-action="kr-toggle"]').forEach((cb) => {
    cb.addEventListener('change', () => toggleKrDone(cb.dataset.oId, cb.dataset.krId));
  });
  el.okrList.querySelectorAll('[data-action="kr-delete"]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      deleteKr(btn.dataset.oId, btn.dataset.krId);
    });
  });
}

function openObjectiveModal(id) {
  if (id) {
    el.modalObjectiveTitle.textContent = '编辑目标（O）';
    el.objectiveId.value = id;
    const o = objectives.find((x) => x.id === id);
    if (o) el.objectiveTitle.value = o.title || '';
  } else {
    el.modalObjectiveTitle.textContent = '新建目标（O）';
    el.objectiveId.value = '';
    el.objectiveTitle.value = '';
  }
  el.modalObjective.hidden = false;
}

function closeObjectiveModal() {
  el.modalObjective.hidden = true;
}

function openKrModal(objectiveId) {
  el.krObjectiveId.value = objectiveId;
  el.krContent.value = '';
  el.modalKr.hidden = false;
}

function closeKrModal() {
  el.modalKr.hidden = true;
}

el.formObjective.addEventListener('submit', (e) => {
  e.preventDefault();
  const id = el.objectiveId.value;
  const title = el.objectiveTitle.value.trim();
  if (!title) return;
  if (id) {
    const o = objectives.find((x) => x.id === id);
    if (o) o.title = title;
  } else {
    objectives.push({ id: nextId('o'), title, keyResults: [] });
  }
  saveOkr();
  closeObjectiveModal();
});

el.btnCancelObjective.addEventListener('click', closeObjectiveModal);
el.modalObjective.querySelector('.modal-backdrop').addEventListener('click', closeObjectiveModal);

el.formKr.addEventListener('submit', (e) => {
  e.preventDefault();
  const oId = el.krObjectiveId.value;
  const content = el.krContent.value.trim();
  if (!content) return;
  const o = objectives.find((x) => x.id === oId);
  if (!o) return;
  if (!o.keyResults) o.keyResults = [];
  o.keyResults.push({ id: nextId('kr'), content, done: false });
  saveOkr();
  closeKrModal();
});

el.btnCancelKr.addEventListener('click', closeKrModal);
el.modalKr.querySelector('.modal-backdrop').addEventListener('click', closeKrModal);

el.btnNewObjective.addEventListener('click', () => openObjectiveModal(null));

function toggleKrDone(oId, krId) {
  const o = objectives.find((x) => x.id === oId);
  if (!o || !o.keyResults) return;
  const kr = o.keyResults.find((x) => x.id === krId);
  if (kr) kr.done = !kr.done;
  saveOkr();
}

function deleteKr(oId, krId) {
  const o = objectives.find((x) => x.id === oId);
  if (!o || !o.keyResults) return;
  o.keyResults = o.keyResults.filter((x) => x.id !== krId);
  saveOkr();
}

function deleteObjective(id) {
  if (!confirm('确定删除该目标及其所有关键结果？')) return;
  objectives = objectives.filter((x) => x.id !== id);
  saveOkr();
}

// ========== 分类点击（侧栏高亮 + 筛选） ==========
el.categoryList.addEventListener('click', (e) => {
  const li = e.target.closest('li[data-id]');
  if (!li || li.classList.contains('empty')) return;
  const id = li.dataset.id;
  selectedCategoryId = selectedCategoryId === id ? '' : id;
  el.filterCategory.value = selectedCategoryId || '';
  renderCategories();
  renderTodos();
});

// ========== 绑定事件 ==========
el.formTodo.addEventListener('submit', submitTodo);
el.btnCancelTodo.addEventListener('click', closeTodoModal);
el.modalTodo.querySelector('.modal-backdrop').addEventListener('click', closeTodoModal);

el.btnNewTodo.addEventListener('click', () => openTodoModal(null));

// ========== 一句话新建任务（自然语言 → 后端解析并创建） ==========
el.btnNaturalLanguageTodo.addEventListener('click', async () => {
  const text = (el.inputNaturalLanguage.value || '').trim();
  if (!text) {
    showApiStatus('请先输入一句话描述任务', 'error');
    return;
  }
  const btn = el.btnNaturalLanguageTodo;
  const origText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '解析中…';
  hideApiStatus();
  try {
    await apiPost('/todos/from-natural-language', { text });
    el.inputNaturalLanguage.value = '';
    showApiStatus('已根据「' + text.slice(0, 20) + (text.length > 20 ? '…' : '') + '」创建任务', 'success');
    await loadTodos();
    setTimeout(hideApiStatus, 3000);
  } catch (err) {
    showApiStatus('创建失败：' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
});
el.inputNaturalLanguage.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    el.btnNaturalLanguageTodo.click();
  }
});

el.formAddCategory.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = el.inputCategoryName.value.trim();
  if (!name) return;
  try {
    await createCategory(name);
    el.inputCategoryName.value = '';
    showApiStatus('分类已添加', 'success');
    setTimeout(hideApiStatus, 1500);
  } catch (err) {
    showApiStatus('添加分类失败：' + err.message, 'error');
  }
});

el.filterStatus.addEventListener('change', onFilterChange);
el.filterPriority.addEventListener('change', onFilterChange);
el.filterCategory.addEventListener('change', onFilterChange);
el.btnResetFilter.addEventListener('click', resetFilter);

// 待办列表点击（编辑/完成/删除）— 事件委托，只绑一次
el.todoList.addEventListener('click', onTodoListClick);

// ========== 初始化 ==========
(async function init() {
  await loadCategories();
  await loadTodos();
})();
