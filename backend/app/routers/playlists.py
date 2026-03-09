"""Playlist management router.

Handles CRUD, import from YouTube, sync for ghost video detection,
and export to YouTube.
"""

import asyncio
import logging
from collections import defaultdict
from fastapi import APIRouter, HTTPException, Header, Request
from typing import Optional

# WARNING-4: Import moved to module level (was inside _get_user_id function body)
from supabase import create_client

from app.models.schemas import (
    ImportPlaylistRequest, ImportPlaylistResponse,
    SyncPlaylistRequest, SyncPlaylistResponse,
    ExportToYouTubeRequest, ExportToYouTubeResponse,
    PlaylistResponse, PlaylistItemResponse, GhostVideo,
    VideoStatus,
)
from app.services import playlist_sync, youtube_api
from app.db.supabase_client import get_supabase_client
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/playlists", tags=["playlists"])


@router.get("", response_model=list[PlaylistResponse])
async def list_playlists(authorization: Optional[str] = Header(None)):
    """List all playlists for the authenticated user."""
    user_id = await _get_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    db = get_supabase_client()
    result = db.table("generated_playlists").select("*").eq(
        "user_id", user_id
    ).order("created_at", desc=True).execute()

    if not result.data:
        return []

    playlist_ids = [p["id"] for p in result.data]

    # Batch fetch all items for all playlists in one query
    items_result = db.table("playlist_items").select("*").in_(
        "playlist_id", playlist_ids
    ).order("position").execute()

    # Batch fetch all referenced videos in one query
    video_ids = list({item["youtube_video_id"] for item in (items_result.data or [])})
    videos_map: dict = {}
    if video_ids:
        videos_result = db.table("videos").select("*").in_(
            "youtube_video_id", video_ids
        ).execute()
        videos_map = {v["youtube_video_id"]: v for v in (videos_result.data or [])}

    # Group items by playlist
    items_by_playlist: dict = defaultdict(list)
    for item in (items_result.data or []):
        items_by_playlist[item["playlist_id"]].append(item)

    # Assemble response
    from app.models.schemas import VideoBase
    playlists = []
    for p in result.data:
        items = []
        for item in items_by_playlist[p["id"]]:
            video = videos_map.get(item["youtube_video_id"])
            video_data = None
            if video:
                video_data = VideoBase(
                    youtube_video_id=video["youtube_video_id"],
                    title=video["title"],
                    channel_name=video.get("channel_name"),
                    description=video.get("description"),
                    thumbnail_url=video.get("thumbnail_url"),
                    duration=video.get("duration"),
                )
            items.append(PlaylistItemResponse(
                id=item["id"],
                youtube_video_id=item["youtube_video_id"],
                position=item.get("position"),
                status=VideoStatus(item["status"]),
                added_at=item["added_at"],
                video=video_data,
            ))

        playlists.append(PlaylistResponse(
            id=p["id"],
            user_id=p["user_id"],
            prompt_text=p["prompt_text"],
            youtube_playlist_id=p.get("youtube_playlist_id"),
            semantic_topic=p.get("semantic_topic"),
            last_synced_at=p.get("last_synced_at"),
            created_at=p["created_at"],
            items=items,
        ))

    return playlists


@router.get("/{playlist_id}", response_model=PlaylistResponse)
async def get_playlist(
    playlist_id: str,
    authorization: Optional[str] = Header(None),
):
    """Get a single playlist with all items and video metadata."""
    user_id = await _get_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    db = get_supabase_client()
    result = db.table("generated_playlists").select("*").eq(
        "id", playlist_id
    ).eq("user_id", user_id).single().execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Playlist not found")

    p = result.data
    items_result = db.table("playlist_items").select("*").eq(
        "playlist_id", playlist_id
    ).order("position").execute()

    # Batch fetch all videos in one query
    video_ids = list({item["youtube_video_id"] for item in (items_result.data or [])})
    videos_map: dict = {}
    if video_ids:
        videos_result = db.table("videos").select("*").in_(
            "youtube_video_id", video_ids
        ).execute()
        videos_map = {v["youtube_video_id"]: v for v in (videos_result.data or [])}

    from app.models.schemas import VideoBase
    items = []
    for item in (items_result.data or []):
        video = videos_map.get(item["youtube_video_id"])
        video_data = None
        if video:
            video_data = VideoBase(
                youtube_video_id=video["youtube_video_id"],
                title=video["title"],
                channel_name=video.get("channel_name"),
                description=video.get("description"),
                thumbnail_url=video.get("thumbnail_url"),
                duration=video.get("duration"),
            )
        items.append(PlaylistItemResponse(
            id=item["id"],
            youtube_video_id=item["youtube_video_id"],
            position=item.get("position"),
            status=VideoStatus(item["status"]),
            added_at=item["added_at"],
            video=video_data,
        ))

    return PlaylistResponse(
        id=p["id"],
        user_id=p["user_id"],
        prompt_text=p["prompt_text"],
        youtube_playlist_id=p.get("youtube_playlist_id"),
        semantic_topic=p.get("semantic_topic"),
        last_synced_at=p.get("last_synced_at"),
        created_at=p["created_at"],
        items=items,
    )


@router.post("/import", response_model=ImportPlaylistResponse)
async def import_playlist(
    request: ImportPlaylistRequest,
    raw_request: Request,
    authorization: Optional[str] = Header(None),
):
    """Import an existing YouTube playlist and snapshot all video metadata.

    This is the key endpoint for solving the "Graveyard Problem" — we store
    video metadata locally so we can identify videos even after YouTube deletes them.
    """
    user_id = await _get_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    # CRITICAL-2: Read YouTube token from header instead of request body
    access_token = raw_request.headers.get("x-youtube-token")
    if not access_token:
        raise HTTPException(status_code=401, detail="YouTube access token required (X-YouTube-Token header)")

    try:
        result = await playlist_sync.import_playlist(
            youtube_playlist_url=request.youtube_playlist_url,
            access_token=access_token,
            user_id=user_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Playlist import failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to import playlist")

    # Get the playlist title (from the first video's playlist info or use generic)
    title = f"Imported Playlist ({result['youtube_playlist_id']})"

    return ImportPlaylistResponse(
        playlist_id=result["playlist_id"],
        title=title,
        total_videos=result["total_videos"],
        active_videos=result["active_videos"],
        deleted_videos=result["deleted_videos"],
        private_videos=result["private_videos"],
    )


@router.post("/{playlist_id}/sync", response_model=SyncPlaylistResponse)
async def sync_playlist(
    playlist_id: str,
    request: SyncPlaylistRequest,
    raw_request: Request,
    authorization: Optional[str] = Header(None),
):
    """Sync a playlist with YouTube to detect ghost videos.

    Compares the current YouTube state against our stored metadata snapshots.
    Returns a list of ghost (deleted/private) videos with their original titles.
    """
    user_id = await _get_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    # CRITICAL-2: Read YouTube token from header instead of request body
    access_token = raw_request.headers.get("x-youtube-token")
    if not access_token:
        raise HTTPException(status_code=401, detail="YouTube access token required (X-YouTube-Token header)")

    try:
        result = await playlist_sync.sync_playlist(
            playlist_id=playlist_id,
            access_token=access_token,
            user_id=user_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Playlist sync failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to sync playlist")

    ghost_videos = [
        GhostVideo(
            youtube_video_id=gv["youtube_video_id"],
            original_title=gv["original_title"],
            original_channel=gv.get("original_channel"),
            status=VideoStatus(gv["status"]),
        )
        for gv in result.get("ghost_videos", [])
    ]

    return SyncPlaylistResponse(
        playlist_id=result["playlist_id"],
        total_videos=result["total_videos"],
        active_videos=result["active_videos"],
        ghost_videos=ghost_videos,
        last_synced_at=result["last_synced_at"],
    )


@router.post("/{playlist_id}/export", response_model=ExportToYouTubeResponse)
async def export_to_youtube(
    playlist_id: str,
    request: ExportToYouTubeRequest,
    raw_request: Request,
    authorization: Optional[str] = Header(None),
):
    """Export an internally-created playlist to the user's YouTube account."""
    user_id = await _get_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    # CRITICAL-2: Read YouTube token from header instead of request body
    access_token = raw_request.headers.get("x-youtube-token")
    if not access_token:
        raise HTTPException(status_code=401, detail="YouTube access token required (X-YouTube-Token header)")

    settings = get_settings()
    db = get_supabase_client()

    # Get playlist and items
    playlist = db.table("generated_playlists").select("*").eq(
        "id", playlist_id
    ).eq("user_id", user_id).single().execute()

    if not playlist.data:
        raise HTTPException(status_code=404, detail="Playlist not found")

    items = db.table("playlist_items").select("*").eq(
        "playlist_id", playlist_id
    ).eq("status", "active").order("position").execute()

    if not items.data:
        raise HTTPException(status_code=400, detail="No active videos to export")

    # Limit to prevent quota exhaustion
    limited_items = items.data[:settings.max_playlist_videos]
    was_limited = len(items.data) > settings.max_playlist_videos

    # Create YouTube playlist
    title = request.playlist_name or playlist.data.get("prompt_text", "AI Generated Playlist")
    yt_playlist_id = await youtube_api.create_playlist(
        access_token,
        title=title[:100],  # YouTube title max length
        description="Generated by PromptPlay AI",
    )

    # WARNING-3: Add videos in parallel instead of sequentially
    tasks = [
        youtube_api.add_video_to_playlist(
            access_token,
            yt_playlist_id,
            item["youtube_video_id"],
        )
        for item in limited_items
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    added = sum(1 for r in results if r is True)
    failed = sum(1 for r in results if r is not True)

    # Update playlist with YouTube ID
    db.table("generated_playlists").update({
        "youtube_playlist_id": yt_playlist_id,
    }).eq("id", playlist_id).execute()

    return ExportToYouTubeResponse(
        youtube_playlist_id=yt_playlist_id,
        youtube_playlist_url=f"https://www.youtube.com/playlist?list={yt_playlist_id}",
        videos_added=added,
        videos_failed=failed,
        was_limited=was_limited,
    )


@router.delete("/{playlist_id}")
async def delete_playlist(
    playlist_id: str,
    authorization: Optional[str] = Header(None),
):
    """Delete a playlist and all its items."""
    user_id = await _get_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    db = get_supabase_client()

    # Verify ownership
    playlist = db.table("generated_playlists").select("id").eq(
        "id", playlist_id
    ).eq("user_id", user_id).single().execute()

    if not playlist.data:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # Cascade delete handles playlist_items
    db.table("generated_playlists").delete().eq("id", playlist_id).execute()

    return {"message": "Playlist deleted"}


async def _get_user_id(authorization: Optional[str]) -> Optional[str]:
    """Extract user ID from the Supabase JWT.

    WARNING-4: create_client import moved to module level.
    The client is created per-request here (lightweight — no connection pooling needed
    for Supabase's REST-based client). A module-level singleton would require sharing
    auth state across requests, which is incorrect for per-user token validation.
    """
    if not authorization:
        return None

    token = authorization.replace("Bearer ", "")
    if not token:
        return None

    try:
        settings = get_settings()
        client = create_client(settings.supabase_url, settings.supabase_anon_key)
        user = client.auth.get_user(token)
        return user.user.id if user and user.user else None
    except Exception as e:
        logger.warning(f"Failed to validate auth token: {e}")
        return None
