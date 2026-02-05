"""
阿里云百炼（DashScope）兼容 OpenAI 接口，用于自然语言解析等。
"""
import json
import os
import re
from openai import OpenAI

from app.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# 调用阿里 API 时绕过系统代理，避免部分环境下的 SSL/连接错误
def _clear_proxy_for_request():
    os.environ.pop("HTTP_PROXY", None)
    os.environ.pop("HTTPS_PROXY", None)
    os.environ.pop("http_proxy", None)
    os.environ.pop("https_proxy", None)
    os.environ.setdefault("NO_PROXY", "*")

# 非流式调用，解析用户一句话为待办字段
SYSTEM_PROMPT = """你是一个待办解析助手。根据用户用自然语言描述的一句话，解析出待办任务的字段，只输出一个 JSON 对象，不要输出任何其他文字、解释或 markdown。

字段说明：
- title: 任务标题，必填，简短概括
- description: 任务描述，可选，可留空或 null
- due_date: 截止日期，格式 YYYY-MM-DD，若能从句子中推断出日期则填写，否则 null
- priority: 优先级，只能是 low / medium / high 之一，根据紧急程度推断，默认 medium

示例：用户说「明天下午 3 点和导师开会讨论开题」，若今天是 2025-02-05，则 due_date 填 2025-02-06。
输出：{"title":"与导师开会讨论开题","description":"明天下午 3 点","due_date":"2025-02-06","priority":"medium"}
若无法推断具体日期则 due_date 填 null。

只输出 JSON，不要用 ```json 包裹。"""


def _get_client() -> OpenAI | None:
    if not settings.ALI_API_KEY:
        return None
    _clear_proxy_for_request()
    return OpenAI(
        api_key=settings.ALI_API_KEY,
        base_url=settings.ALI_BASE_URL,
    )


def parse_natural_language_to_todo(text: str) -> dict:
    """
    将用户一句话解析为待办字段 dict，可直接用于 TodoCreate。
    返回 {"title": str, "description": str|None, "due_date": str|None, "priority": str, ...}
    若解析失败或未配置 API Key 则抛出 ValueError。
    """
    client = _get_client()
    if not client:
        raise ValueError("未配置 BAILIAN_API_KEY 或 OPENAI_API_KEY，无法使用自然语言解析")

    response = client.chat.completions.create(
        model=settings.ALI_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text.strip()},
        ],
        temperature=0.2,
        timeout=60.0,
    )
    raw = (response.choices[0].message.content or "").strip()
    if not raw:
        raise ValueError("模型未返回有效内容")

    # 去掉可能的 ```json ... ``` 包裹
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```\s*$", "", raw)
    raw = raw.strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        logger.warning("llm parse json failed raw=%s err=%s", raw[:200], e)
        raise ValueError("解析结果不是合法 JSON") from e

    if not isinstance(data, dict):
        raise ValueError("解析结果不是对象")

    title = (data.get("title") or "").strip()
    if not title:
        title = text[:100].strip() or "未命名任务"

    description = data.get("description")
    if description is not None and not isinstance(description, str):
        description = str(description) if description else None
    if description is not None:
        description = description.strip() or None

    due_date = data.get("due_date")
    if due_date is not None and not isinstance(due_date, str):
        due_date = None
    if due_date is not None:
        due_date = due_date.strip() or None

    priority = (data.get("priority") or "medium").lower()
    if priority not in ("low", "medium", "high"):
        priority = "medium"

    return {
        "title": title,
        "description": description,
        "status": "pending",
        "priority": priority,
        "due_date": due_date,
        "category_id": None,
    }
