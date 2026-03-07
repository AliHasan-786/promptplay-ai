"""Playlist management router.

Handles CRUD, import from YouTube, sync for ghost video detection,
and export to YouTube.
"""

import logging
from fastapi import APIRouter, HTTPException, Header
from typing import Optional

from app.models.schemas import (
    ImportPlaylistRequest, ImportPlaylistResponse,
    SyncPlaylistRequest, SyncPlaylistResponse,
    ExportToYouTubeRequest, ExportToYouTubeResponse,
    PlaylistResponse, PlaylistItemResponse, GhostVideo,
    VideoStatus,
)
from app.services import playlist_sync, youtube_api, ghost_recovery
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

    playlists = []
    for p in result.data:
        # Get items for each playlist
        items_result = db.table("playlist_items").select("*").eq(
            "playlist_id", p["id"]
        ).order("position").execute()

        items = []
        for item in items_result.data:
            # Join with video metadata
            video = db.table("videos").select("*").eq(
                "youtube_video_id", item["youtube_video_id"]
            ).single().execute()

            video_data = None
            if video.data:
                from app.models.schemas import VideoBase
                video_data = VideoBase(
                    youtube_video_id=video.data["youtube_video_id"],
                    title=video.data["title"],
                    channel_name=video.data.get("channel_name"),
                    description=video.data.get("description"),
                    thumbnail_url=video.data.get("thumbnail_url"),
                    duration=video.data.get("duration"),
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

    items = []
    for item in items_result.data:
        video = db.table("videos").select("*").eq(
            "youtube_video_id", item["youtube_video_id"]
        ).single().execute()

        video_data = None
        if video.data:
            from app.models.schemas import VideoBase
            video_data = VideoBase(
                youtube_video_id=video.data["youtube_video_id"],
                title=video.data["title"],
                channel_name=video.data.get("channel_name"),
                description=video.data.get("description"),
                thumbnail_url=video.data.get("thumbnail_url"),
                duration=video.data.get("duration"),
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
    authorization: Optional[str] = Header(None),
):
    """Import an existing YouTube playlist and snapshot all video metadata.

    This is the key endpoint for solving the "Graveyard Problem" — we store
    video metadata locally so we can identify videos even after YouTube deletes them.
    """
    user_id = await _get_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        result = await playlist_sync.import_playlist(
            youtube_playlist_url=request.youtube_playlist_url,
            access_token=request.access_token,
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
    authorization: Optional[str] = Header(None),
):
    """Sync a playlist with YouTube to detect ghost videos.

    Compares the current YouTube state against our stored metadata snapshots.
    Returns a list of ghost (deleted/private) videos with their original titles.
    """
    user_id = await _get_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        result = await playlist_sync.sync_playlist(
            playlist_id=playlist_id,
            access_token=request.access_token,
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
    authorization: Optional[str] = Header(None),
):
    """Export an internally-created playlist to the user's YouTube account."""
    user_id = await _get_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

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
        request.access_token,
        title=title[:100],  # YouTube title max length
        description=f"Generated by PromptPlay AI",
    )

    # Add videos
    added = 0
    failed = 0
    for item in limited_items:
        success = await youtube_api.add_video_to_playlist(
            request.access_token,
            yt_playlist_id,
            item["youtube_video_id"],
        )
        if success:
            added += 1
        else:
            failed += 1

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
    """Extract user ID from the Supabase JWT."""
    if not authorization:
        return None

    token = authorization.replace("Bearer ", "")
    if not token:
        return None

    try:
        from supabase import create_client
        settings = get_settings()
        client = create_client(settings.supabase_url, settings.supabase_anon_key)
        user = client.auth.get_user(token)
        return user.user.id if user and user.user else None
    except Exception as e:
        logger.warning(f"Failed to validate auth token: {e}")
        return None
