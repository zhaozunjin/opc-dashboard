"""
AI 抽象层 — 统一接口，多 provider 切换
支持：deepseek（默认）/ openai / claude
"""
import httpx
from app.config import settings


# ── Provider 配置 ─────────────────────────────────
PROVIDERS = {
    "deepseek": {
        "base_url": "https://api.deepseek.com/v1",
        "model": "deepseek-chat",
        "api_key_env": "deepseek_api_key",
    },
    "openai": {
        "base_url": "https://api.openai.com/v1",
        "model": "gpt-4o-mini",
        "api_key_env": "openai_api_key",
    },
    "claude": {
        "base_url": "https://api.anthropic.com/v1",
        "model": "claude-sonnet-4-20250514",
        "api_key_env": "claude_api_key",
    },
}


def _get_api_key(provider: str) -> str:
    return getattr(settings, PROVIDERS[provider]["api_key_env"], "")


async def generate(prompt: str, context: str = "", system: str = "") -> dict:
    """
    统一 LLM 调用接口
    返回: { "response": str, "provider": str, "model": str }
    """
    provider = settings.ai_provider
    config = PROVIDERS.get(provider, PROVIDERS["deepseek"])
    api_key = _get_api_key(provider)

    if not api_key:
        return {
            "response": f"[AI 未配置] provider={provider}，请在环境变量中设置 API key。\n\n基于模板的建议：\n{prompt[:500]}",
            "provider": provider,
            "model": "template-fallback",
        }

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    if context:
        messages.append({"role": "user", "content": f"背景信息：\n{context}"})
    messages.append({"role": "user", "content": prompt})

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{config['base_url']}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": config["model"],
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1000,
                },
            )
            resp.raise_for_status()
            data = resp.json()
            text = data["choices"][0]["message"]["content"]
            return {"response": text, "provider": provider, "model": config["model"]}
    except Exception as e:
        return {
            "response": f"[AI 调用失败: {e}]",
            "provider": provider,
            "model": config["model"],
        }
