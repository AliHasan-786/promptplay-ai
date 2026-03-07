"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Supabase
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_anon_key: str = ""

    # Vite-prefixed Supabase vars (auto-loaded from root .env)
    vite_supabase_url: str = ""
    vite_supabase_publishable_key: str = ""

    # LLM API (OpenAI-compatible endpoint)
    llmapi_key: str = ""
    llmapi_base_url: str = "https://internal.llmapi.ai/v1/chat/completions"
    llmapi_model: str = "gpt-4o-mini"

    # Embeddings (uses same LLMAPI key if OpenAI-compatible, or separate)
    openai_api_key: str = ""

    # YouTube
    google_client_id: str = ""
    google_client_secret: str = ""
    youtube_api_key: str = ""

    # App
    frontend_url: str = "http://localhost:5173"

    # Limits
    max_playlist_videos: int = 15
    youtube_daily_quota: int = 10000

    @property
    def effective_supabase_url(self) -> str:
        return self.supabase_url or self.vite_supabase_url

    @property
    def effective_supabase_anon_key(self) -> str:
        return self.supabase_anon_key or self.vite_supabase_publishable_key

    model_config = {
        "env_file": ("../.env", ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache()
def get_settings() -> Settings:
    return Settings()
