"""
Multi-provider AI service for Assistente Digital MegaFarma.
Supports: OpenRouter, Groq, Hugging Face Inference API.
"""

import httpx
import base64
import json
from typing import Optional

SYSTEM_PROMPT = (
    "Você é a Mega, assistente virtual da farmácia MegaFarma. "
    "Você trabalha na MegaFarma e tem orgulho disso.\n\n"
    "REGRAS DE SAUDAÇÃO:\n"
    "- Sempre que alguém iniciar uma conversa, dê as boas-vindas em nome da MegaFarma.\n"
    "- Use saudações baseadas no horário: Bom dia (6h-12h), Boa tarde (12h-18h), Boa noite (18h-6h).\n"
    "- Exemplo: 'Boa tarde! Seja bem-vindo(a) à MegaFarma! Sou a Mega, como posso te ajudar hoje?'\n"
    "- Ao final da conversa, agradeça: 'Agradecemos sua visita à MegaFarma! Volte sempre!'\n"
    "- Seja sempre acolhedora, simpática e profissional.\n\n"
    "REGRAS DE ATENDIMENTO:\n"
    "- Foque em indicar Medicamentos Isentos de Prescrição (MIPs) para os sintomas relatados.\n"
    "- NÃO mande o cliente procurar um médico, a menos que seja um caso de vida ou morte evidente.\n"
    "- Sua missão é ajudar o cliente a escolher um produto MIP ou tirar dúvidas da farmácia de forma rápida.\n"
    "- Seja CURTA e DIRETA nas respostas, sem enrolação.\n"
    "- Sempre que possível, mencione que o produto está disponível na MegaFarma.\n"
    "- Trate cada cliente com carinho, como se fosse da família MegaFarma."
)

# ── Provider configurations ────────────────────────────────────────────────────

PROVIDER_ENDPOINTS = {
    "openrouter": "https://openrouter.ai/api/v1/chat/completions",
    "groq": "https://api.groq.com/openai/v1/chat/completions",
    "huggingface": "https://api-inference.huggingface.co/models/{model}/v1/chat/completions",
}


def _build_headers(provider: str, api_key: str) -> dict:
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }
    if provider == "openrouter":
        headers["HTTP-Referer"] = "https://megafarma.app"
        headers["X-Title"] = "Assistente Digital MegaFarma"
    return headers


def _build_messages(
    history: list[dict],
    message: str,
    image_b64: Optional[str] = None,
) -> list[dict]:
    """Build the messages array with system prompt, history, and current message."""
    from datetime import datetime, timezone, timedelta
    # Brasília timezone (UTC-3)
    tz_brasilia = timezone(timedelta(hours=-3))
    now = datetime.now(tz_brasilia)
    hora = now.strftime("%H:%M")
    
    # Add current time context to system prompt
    system_with_time = f"{SYSTEM_PROMPT}\n\nHORÁRIO ATUAL: {hora} (use para saudações adequadas)."
    
    messages = [{"role": "system", "content": system_with_time}]

    # Add conversation history
    for h in history:
        role = h.get("role", "user")
        content = h.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    # Build current user message
    if image_b64:
        # Multimodal content
        content_parts = []
        if message:
            content_parts.append({"type": "text", "text": message})
        content_parts.append({
            "type": "image_url",
            "image_url": {
                "url": f"data:image/jpeg;base64,{image_b64}"
            }
        })
        messages.append({"role": "user", "content": content_parts})
    else:
        messages.append({"role": "user", "content": message})

    return messages


async def chat(
    message: str,
    history: list[dict],
    image_b64: Optional[str],
    api_key: str,
    model_name: str,
    provider: str,
) -> str:
    """Send chat request to the configured AI provider and return response text."""
    import requests

    provider = provider.lower().strip()
    if provider not in PROVIDER_ENDPOINTS:
        return f"Provedor '{provider}' não suportado."

    if not api_key:
        return "⚠️ API Key não configurada."

    endpoint = PROVIDER_ENDPOINTS[provider]
    if provider == "huggingface":
        endpoint = endpoint.format(model=model_name)

    if image_b64 and provider == "groq":
        image_b64 = None

    messages = _build_messages(history, message, image_b64)
    payload = {
        "model": model_name,
        "messages": messages,
        "max_tokens": 1024,
        "temperature": 0.7,
    }
    headers = _build_headers(provider, api_key)

    print(f"[DEBUG] Chat request via Requests to {provider} ({model_name})")
    try:
        # Using requests (blocking call in async def is ok for limited concurrency here)
        response = requests.post(endpoint, json=payload, headers=headers, timeout=60)

        if response.status_code != 200:
            error_content = response.text
            print(f"[ERROR] Provider {provider} returned status {response.status_code}: {error_content}")
            try:
                err_json = response.json()
                error_obj = err_json.get("error", {})
                if isinstance(error_obj, dict):
                    msg = error_obj.get("message") or err_json.get("message")
                else:
                    msg = str(error_obj)
                return f"Erro do provedor ({response.status_code}): {msg or error_content[:200]}"
            except:
                return f"Erro do provedor ({response.status_code}): {error_content[:200]}"

        data = response.json()
        choices = data.get("choices", [])
        if choices:
            return choices[0].get("message", {}).get("content", "Sem resposta da IA.")

        return "Resposta inesperada do provedor de IA."

    except requests.exceptions.Timeout:
        return "⏱️ A requisição demorou muito. Tente novamente."
    except Exception as e:
        print(f"[ERROR] Exception in AI communication (Requests): {str(e)}")
        return f"Erro ao se comunicar com a IA: {str(e)}"
