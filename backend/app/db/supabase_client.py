"""Supabase client initialization for the backend."""

from supabase import create_client, Client
from app.config import get_settings


def get_supabase_client() -> Client:
    """Get a Supabase client using the service role key.
    
    The service role key bypasses RLS and allows the backend
    to manage videos and embeddings that aren't tied to a specific user session.
    Falls back to the Vite anon key if service role key is not configured.
    """
    settings = get_settings()
    url = settings.effective_supabase_url
    key = settings.supabase_service_role_key or settings.effective_supabase_anon_key

    if not url or not key:
        raise RuntimeError(
            "Supabase is not configured. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY "
            "or VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY in .env"
        )

    return create_client(url, key)


def get_supabase_anon_client() -> Client:
    """Get a Supabase client using the anon key (for user-scoped operations)."""
    settings = get_settings()
    url = settings.effective_supabase_url
    key = settings.effective_supabase_anon_key

    if not url or not key:
        raise RuntimeError("Supabase anon key is not configured.")

    return create_client(url, key)
