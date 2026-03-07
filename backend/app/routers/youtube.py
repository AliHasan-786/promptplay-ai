"""YouTube OAuth helper router.

Provides endpoints for the frontend to initiate OAuth and exchange codes.
This mirrors the existing Supabase edge function but runs on FastAPI.
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/youtube", tags=["youtube"])


class AuthUrlRequest(BaseModel):
    redirect_uri: str


class AuthUrlResponse(BaseModel):
    auth_url: str


class ExchangeCodeRequest(BaseModel):
    code: str
    redirect_uri: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    expires_in: int


@router.post("/auth-url", response_model=AuthUrlResponse)
async def get_auth_url(request: AuthUrlRequest):
    """Generate a Google OAuth authorization URL for YouTube access."""
    settings = get_settings()

    if not settings.google_client_id:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    from urllib.parse import urlencode

    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": request.redirect_uri,
        "response_type": "code",
        "scope": "https://www.googleapis.com/auth/youtube",
        "access_type": "offline",
        "prompt": "consent",
    }

    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"

    return AuthUrlResponse(auth_url=auth_url)


@router.post("/exchange-code", response_model=TokenResponse)
async def exchange_code(request: ExchangeCodeRequest):
    """Exchange an OAuth authorization code for access and refresh tokens."""
    settings = get_settings()

    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": request.code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": request.redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if response.status_code != 200:
            data = response.json()
            error_msg = data.get("error_description", data.get("error", "Token exchange failed"))
            logger.error(f"Google token exchange error: {data}")
            raise HTTPException(status_code=400, detail=error_msg)

        tokens = response.json()

        return TokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens.get("refresh_token"),
            expires_in=tokens.get("expires_in", 3600),
        )
