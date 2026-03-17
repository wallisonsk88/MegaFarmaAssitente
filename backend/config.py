import os

DEFAULT_CONFIG = {
    "API_KEY": os.getenv("API_KEY", ""),
    "MODEL_NAME": os.getenv("MODEL_NAME", "meta-llama/llama-4-scout-17b-16e-instruct:free"),
    "MODEL_PROVIDER": os.getenv("MODEL_PROVIDER", "openrouter")
}

# Armazenamento em memória (efêmero na Vercel)
_current_config = dict(DEFAULT_CONFIG)

def get_config() -> dict:
    """Load configuration from memory."""
    return dict(_current_config)


def save_config(data: dict) -> dict:
    """Save configuration to memory (ephemeral on Vercel)."""
    global _current_config
    for key in ("API_KEY", "MODEL_NAME", "MODEL_PROVIDER"):
        if key in data and data[key]:
            _current_config[key] = data[key]
    return dict(_current_config)
