from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )
    bot_token: str = ""
    mini_app_url: str = "https://mindscript-64qg.onrender.com"
    ngrok_domain: str | None = None
    app_name: str = "VIBEPROMT API"
    database_url: str = "sqlite:///./vibepromt.db"
    llm_provider: str = "nvidia"
    llm_model: str = "nvidia/nemotron-3.5-bolt-e4b"
    admin_telegram_id: str = "5189141840"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"

    nvidia_api_key: str | None = None
    nvidia_model: str = "nvidia/nemotron-3.5-bolt-e4b"
    nvidia_api_url: str = "https://integrate.api.nvidia.com/v1/chat/completions"
    nvidia_max_tokens: int = 4096

    # OX Alpha (имена совпадают с переменными в .env)
    ox_alpha_api_key: str | None = None
    ox_alpha_base_url: str = "https://api.oxalpha.com/v1"
    ox_alpha_model: str = "ox-alpha"
    ox_alpha_max_tokens: int = 8192


    request_limit_per_minute: int = 60
    host: str = "0.0.0.0"
    port: int = 8000

    @property
    def static_dir(self) -> Path:
        return Path(__file__).resolve().parents[2] / "frontend"


settings = Settings()
