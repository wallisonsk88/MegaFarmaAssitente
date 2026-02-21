"""
TTS Service using Microsoft Edge Neural Voices (edge-tts).
Provides high-quality, human-like text-to-speech for free.
"""

import edge_tts
import io
import re

# Microsoft Neural Voice for Brazilian Portuguese (Francisca = feminine, warm voice)
DEFAULT_VOICE = "pt-BR-FranciscaNeural"

# Phonetic corrections for better pronunciation
PHONETIC_MAP = {
    "MIPs": "remédios isentos de receita",
    "MIP": "remédio isento de receita",
    "MegaFarma": "Mega Farma",
    "AI": "inteligência artificial",
    "bot": "assistente",
}


def clean_text_for_tts(text: str) -> str:
    """Clean markdown and formatting from text for TTS."""
    clean = text
    # Remove markdown formatting
    clean = re.sub(r'\*\*(.*?)\*\*', r'\1', clean)  # bold
    clean = re.sub(r'\*(.*?)\*', r'\1', clean)  # italic
    clean = re.sub(r'[_~`#>]', '', clean)  # other markdown
    clean = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', clean)  # links
    clean = re.sub(r'\n{2,}', '. ', clean)  # double newlines
    clean = re.sub(r'\n', ', ', clean)  # single newlines
    clean = clean.strip()

    # Apply phonetic fixes
    for key, value in PHONETIC_MAP.items():
        clean = re.sub(rf'\b{re.escape(key)}\b', value, clean, flags=re.IGNORECASE)

    return clean


async def generate_speech(text: str, voice: str = DEFAULT_VOICE) -> bytes:
    """Generate speech audio (MP3) from text using Microsoft Neural TTS."""
    clean = clean_text_for_tts(text)
    if not clean:
        return b""

    communicate = edge_tts.Communicate(clean, voice, rate="+0%", pitch="+0Hz")

    audio_buffer = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_buffer.write(chunk["data"])

    return audio_buffer.getvalue()
