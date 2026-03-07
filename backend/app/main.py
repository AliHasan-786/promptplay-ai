"""FastAPI application entry point.

Run with: uvicorn app.main:app --reload --port 8000
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import generate, playlists, suggestions, youtube

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

settings = get_settings()

app = FastAPI(
    title="PromptPlay AI — YouTube Playlist Manager",
    description=(
        "AI-powered YouTube playlist curation with ghost video detection, "
        "semantic search, and conversational generation."
    ),
    version="0.1.0",
)

# CORS — allow the Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(generate.router)
app.include_router(playlists.router)
app.include_router(suggestions.router)
app.include_router(youtube.router)


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "status": "ok",
        "app": "PromptPlay AI",
        "version": "0.1.0",
    }


@app.get("/api/health")
async def health():
    """Detailed health check."""
    return {
        "status": "ok",
        "llm_provider": settings.llm_provider,
        "supabase_configured": bool(settings.supabase_url and settings.supabase_service_role_key),
        "youtube_configured": bool(settings.google_client_id),
        "embeddings_configured": bool(settings.openai_api_key),
    }
