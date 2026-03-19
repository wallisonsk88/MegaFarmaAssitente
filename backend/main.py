"""
Assistente Digital MegaFarma — FastAPI Backend
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel, Field
from typing import Optional
import os
import base64

from config import get_config, save_config
from services.ai_provider import chat as ai_chat
from services.tts_service import generate_speech

app = FastAPI(title="Assistente Digital MegaFarma")

# ── CORS ────────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Constants ───────────────────────────────────────────────────────────────────
MAX_TEXT_LENGTH = 2000
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB in bytes


# ── Models ──────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str = Field(..., max_length=MAX_TEXT_LENGTH)
    history: list[dict] = Field(default_factory=list)
    image: Optional[str] = None  # base64 encoded
    api_key: Optional[str] = None
    model_name: Optional[str] = None
    provider: Optional[str] = None


class ConfigUpdate(BaseModel):
    API_KEY: Optional[str] = None
    MODEL_NAME: Optional[str] = None
    MODEL_PROVIDER: Optional[str] = None


class TTSRequest(BaseModel):
    text: str = Field(..., max_length=5000)


# ── Endpoints ───────────────────────────────────────────────────────────────────

@app.post("/api/chat")
@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    """Process a chat message through the AI provider."""

    # Validate image size
    image_b64 = req.image
    if image_b64:
        try:
            raw_size = len(base64.b64decode(image_b64))
            if raw_size > MAX_IMAGE_SIZE:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Imagem muito grande. Máximo permitido: 5 MB."}
                )
        except Exception:
            image_b64 = None  # Invalid base64, ignore image

    # Validate text
    message = req.message.strip()
    if not message and not image_b64:
        return JSONResponse(
            status_code=400,
            content={"error": "Envie uma mensagem ou imagem."}
        )

    config = get_config()
    
    req_api_key = req.api_key or config.get("API_KEY", "")
    req_model_name = req.model_name or config.get("MODEL_NAME", "meta-llama/llama-4-scout-17b-16e-instruct:free")
    req_provider = req.provider or config.get("MODEL_PROVIDER", "openrouter")

    response_text = await ai_chat(
        message=message,
        history=req.history,
        image_b64=image_b64,
        api_key=req_api_key,
        model_name=req_model_name,
        provider=req_provider,
    )

    return {"response": response_text}


@app.post("/api/tts")
@app.post("/tts")
async def tts_endpoint(req: TTSRequest):
    """Generate speech audio from text using Microsoft Neural TTS."""
    try:
        audio_data = await generate_speech(req.text)
        if not audio_data:
            return JSONResponse(status_code=400, content={"error": "Texto vazio."})
        return Response(
            content=audio_data,
            media_type="audio/mpeg",
            headers={"Content-Disposition": "inline; filename=speech.mp3"}
        )
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Erro ao gerar áudio: {str(e)}"})


@app.get("/api/config")
@app.get("/config")
async def get_config_endpoint():
    """Return current configuration (without exposing API key)."""
    config = get_config()
    return {
        "MODEL_NAME": config.get("MODEL_NAME", ""),
        "MODEL_PROVIDER": config.get("MODEL_PROVIDER", ""),
        "has_api_key": bool(config.get("API_KEY", "")),
    }


@app.post("/api/config")
@app.post("/config")
async def update_config_endpoint(req: ConfigUpdate):
    """Update AI configuration."""
    # Pydantic v1/v2 compatibility
    if hasattr(req, "model_dump"):
        data = req.model_dump(exclude_none=True)
    else:
        data = req.dict(exclude_none=True)
    
    updated = save_config(data)
    return {
        "MODEL_NAME": updated.get("MODEL_NAME", ""),
        "MODEL_PROVIDER": updated.get("MODEL_PROVIDER", ""),
        "has_api_key": bool(updated.get("API_KEY", "")),
        "message": "Configuração atualizada com sucesso!"
    }


# ── Serve Frontend ──────────────────────────────────────────────────────────────

FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")


@app.get("/")
async def serve_index():
    return FileResponse(os.path.join(FRONTEND_DIR, "index.html"))


# Mount static files AFTER specific routes
app.mount("/", StaticFiles(directory=FRONTEND_DIR), name="frontend")

