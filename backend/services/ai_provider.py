"""
Multi-provider AI service for Assistente Digital MegaFarma.
Supports: OpenRouter, Groq, Hugging Face Inference API.
"""

import httpx
import base64
import json
from typing import Optional

SYSTEM_PROMPT = (
    "Você é a Mega, Farmacêutica Profissional e especialista em atendimento de balcão da farmácia MegaFarma. "
    "Você possui profundo conhecimento sobre medicamentos, princípios ativos, posologia e interações medicamentosas. "
    "Sua postura é clínica, segura, consistente e extremamente profissional, focada em resolver o problema do paciente com exatidão.\n\n"
    "REGRAS DE POSTURA E CONSISTÊNCIA:\n"
    "- Mantenha a coerência: NUNCA mude de assunto abruptamente e NUNCA sugira produtos ou ideias que não foram solicitadas.\n"
    "- Transmita segurança: Fale com a propriedade de um foco em saúde. Se indicar algo, explique muito brevemente a função.\n"
    "- Não seja confusa: Responda exatamente o que o cliente perguntou.\n\n"
    "REGRAS DE SAUDAÇÃO:\n"
    "- Use a saudação correta ('Bom dia', 'Boa tarde' ou 'Boa noite') acompanhada de 'Sou a Mega, farmacêutica da MegaFarma' APENAS na PRIMEIRA mensagem.\n"
    "- Nas mensagens seguintes, foque estritamente em responder a dúvida. Não seja repetitiva.\n"
    "- Ao final da conversa, SOMENTE se o cliente se despedir, diga: 'A MegaFarma agradece! Estou à disposição.'\n"
    "- Responda sempre em português do Brasil impecável.\n\n"
    "REGRAS DE ATENDIMENTO E PREÇOS:\n"
    "- Baseie-se APENAS nos [RESULTADOS DA BUSCA NO ESTOQUE] injetados no final deste prompt para informar preços reais.\n"
    "- NUNCA invente preços ou suponha valores. Se o produto não estiver nos resultados da busca, informe que não o encontrou no sistema no momento.\n"
    "- Foque em indicar Medicamentos Isentos de Prescrição (MIPs) para os sintomas relatados.\n"
    "- NUNCA preencha a tela do usuário com textões ou listas longas. Indique no máximo 2 produtos de forma muito natural, como no balcão.\n"
    "- SÓ oriente procurar um médico em casos de extrema urgência/gravidade evidente.\n"
    "- Contatos MegaFarma: Av Cristovão Colombo, 1174, Bairro Trizidela | WhatsApp/Telefone: (99) 9 8274-6469."
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


def search_store_products(query: str) -> str:
    """Busca produtos no site da MegaFarma simulando uma consulta ao estoque."""
    import re
    import json
    import urllib.parse
    import requests
    
    try:
        msg_lower = query.lower()
        if not re.search(r'\b(preço|preco|valor|custa|tem|têm)\b', msg_lower):
            return ""
            
        stopwords = ["qual", "o", "a", "do", "da", "de", "preço", "preco", "valor", "custa", "tem", "vocês", "voces", "gostaria", "saber", "quanto", "é", "por", "favor", "me", "informe", "você", "voce", "queria", "saber"]
        words = re.findall(r'\w+', msg_lower)
        query_words = [w for w in words if w not in stopwords and len(w) > 2]
        if not query_words:
            return ""
            
        search_term = " ".join(query_words)
        print(f"[DEBUG] Procurando produtos no site para: {search_term}")
        
        query_encoded = urllib.parse.quote(search_term)
        # Usar a API direta do MyCommerce
        url = f"https://meucomercio.com.br/api/product/shop/1673173/products?page=1&perPage=20&search={query_encoded}"
        headers = {
            "Accept": "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Referer": "https://meucomercio.com.br/megafarmacodo"
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            print(f"[ERROR] API de busca retornou status {response.status_code}")
            return ""
            
        data = response.json()
        products = data.get("products", [])
        
        if not products:
            return "Nenhum produto encontrado no estoque para esta busca."
            
        results = []
        for p in products[:5]:
            name = p.get("ProductName", "Produto sem nome")
            price = p.get("SalePrice", 0)
            promo_price = p.get("PromoSalePrice", 0)
            final_price = promo_price if promo_price > 0 else price
            
            if final_price:
                price_str = f"R$ {final_price:.2f}".replace(".", ",")
                results.append(f"- {name}: {price_str}")
            
        return "\n".join(results)
    except Exception as e:
        print(f"[ERROR] Falha ao buscar produtos no site: {e}")
        return ""


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
    
    search_results = ""
    if message:
        results = search_store_products(message)
        if results:
            search_results = f"\n\n[RESULTADOS DA BUSCA NO ESTOQUE POR: {message}]\n{results}\n(Aja como humano, diga 'encontrei esses produtos...' e informe os valores naturalmente. Não revele os detalhes de busca técnica.)"

    # Add current time context and search context to system prompt
    system_with_time = f"{SYSTEM_PROMPT}\n\nHORÁRIO ATUAL: {hora} (use para saudações adequadas).{search_results}"
    
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
        "max_tokens": 256,
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
