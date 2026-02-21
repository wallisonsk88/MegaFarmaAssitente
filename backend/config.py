import json
import os

CONFIG_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "config.json")

DEFAULT_CONFIG = {
    "API_KEY": "",
    "MODEL_NAME": "meta-llama/llama-4-scout-17b-16e-instruct:free",
    "MODEL_PROVIDER": "openrouter"
}


def get_config() -> dict:
    """Load configuration from config.json, creating it with defaults if missing."""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
            # Merge with defaults so new keys are always present
            merged = {**DEFAULT_CONFIG, **data}
            return merged
        except (json.JSONDecodeError, IOError):
            pass
    # File missing or corrupt — return defaults
    save_config(DEFAULT_CONFIG)
    return dict(DEFAULT_CONFIG)


def save_config(data: dict) -> dict:
    """Save configuration to config.json. Only updates provided keys."""
    current = get_config() if os.path.exists(CONFIG_FILE) else dict(DEFAULT_CONFIG)
    for key in ("API_KEY", "MODEL_NAME", "MODEL_PROVIDER"):
        if key in data and data[key]:
            current[key] = data[key]
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(current, f, indent=2, ensure_ascii=False)
    return current
