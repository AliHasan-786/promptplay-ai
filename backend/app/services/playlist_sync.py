"""Playlist sync service.

Handles importing YouTube playlists, snapshotting metadata,
detecting ghost (deleted/private) videos, and finding replacements.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from app.db.supabase_client import get_supabase_client
from app.services import youtube_api, ghost_recovery, embeddings

logger = logging.getLogger(__name__)


async def import_playlist(
    youtube_playlist_url: str,
    access_token: str,
    user_id: str,
) -> dict:
    """Import an existing YouTube playlist and snapshot all video metadata.

    This is the core mechanism for solving the "Graveyard Problem":
    we store title, channel, and description BEFORE videos get deleted.

    Args:
        youtube_playlist_url: Full YouTube playlist URL.
        access_token: User's YouTube OAuth access token.
        user_id: Supabase user ID.

    Returns:
        Import summary dict.
    """
    # Extract playlist ID from URL
    yt_playlist_id = youtube_api.extract_playlist_id(youtube_playlist_url)
    if not yt_playlist_id:
        raise ValueError("Invalid YouTube playlist URL")

    # Fetch all items from YouTube
    items = await youtube_api.get_playlist_items(
        yt_playlist_id,
        access_token=access_token,
    )

    if not items:
        raise ValueError("Playlist is empty or could not be fetched")

    db = get_supabase_client()

    # Create playlist record in our DB
    playlist_result = db.table("generated_playlists").insert({
        "user_id": user_id,
        "prompt_text": f"Imported from YouTube: {yt_playlist_id}",
        "youtube_playlist_id": yt_playlist_id,
        "last_synced_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    playlist_id = playlist_result.data[0]["id"]

    # Counters
    active_count = 0
    deleted_count = 0
    private_count = 0

    # Process each item
    for item in items:
        video_id = item["youtube_video_id"]
        status = item["status"]

        if status == "active":
            active_count += 1
            # Snapshot the metadata in our videos table
            _upsert_video(db, item)
        elif status == "deleted":
            deleted_count += 1
            # Attempt to recover metadata for already-deleted videos
            recovered = await ghost_recovery.recover_video_title(video_id)
            if recovered:
                _upsert_video(db, {
                    "youtube_video_id": video_id,
                    "title": recovered.get("title", f"Deleted video ({video_id})"),
                    "channel_name": recovered.get("channel_name"),
                    "description": "",
                    "thumbnail_url": "",
                })
            else:
                _upsert_video(db, {
                    "youtube_video_id": video_id,
                    "title": f"Deleted video ({video_id})",
                    "channel_name": None,
                    "description": "",
                    "thumbnail_url": "",
                })
        elif status == "private":
            private_count += 1
            _upsert_video(db, {
                "youtube_video_id": video_id,
                "title": f"Private video ({video_id})",
                "channel_name": None,
                "description": "",
                "thumbnail_url": "",
            })

        # Create playlist_item record
        db.table("playlist_items").upsert({
            "playlist_id": playlist_id,
            "youtube_video_id": video_id,
            "position": item.get("position", 0),
            "status": status,
        }, on_conflict="playlist_id,youtube_video_id").execute()

    logger.info(
        f"Imported playlist {yt_playlist_id}: "
        f"{active_count} active, {deleted_count} deleted, {private_count} private"
    )

    return {
        "playlist_id": playlist_id,
        "youtube_playlist_id": yt_playlist_id,
        "total_videos": len(items),
        "active_videos": active_count,
        "deleted_videos": deleted_count,
        "private_videos": private_count,
    }


async def sync_playlist(
    playlist_id: str,
    access_token: str,
) -> dict:
    """Re-sync a playlist with YouTube to detect newly deleted/private videos.

    Compares the current YouTube state against our snapshotted metadata
    to identify ghost videos.

    Args:
        playlist_id: Our internal playlist ID.
        access_token: User's YouTube OAuth access token.

    Returns:
        Sync result with ghost video details.
    """
    db = get_supabase_client()

    # Get playlist from our DB
    playlist = db.table("generated_playlists").select("*").eq(
        "id", playlist_id
    ).single().execute()

    if not playlist.data:
        raise ValueError("Playlist not found")

    yt_playlist_id = playlist.data.get("youtube_playlist_id")
    if not yt_playlist_id:
        raise ValueError("This playlist has no linked YouTube playlist")

    # Fetch current state from YouTube
    current_items = await youtube_api.get_playlist_items(
        yt_playlist_id,
        access_token=access_token,
    )

    # Get our stored items
    stored_items = db.table("playlist_items").select("*").eq(
        "playlist_id", playlist_id
    ).execute()
    stored_map = {item["youtube_video_id"]: item for item in stored_items.data}

    ghost_videos = []

    for yt_item in current_items:
        video_id = yt_item["youtube_video_id"]
        new_status = yt_item["status"]

        if video_id in stored_map:
            old_status = stored_map[video_id]["status"]

            # Detect videos that became deleted or private
            if old_status == "active" and new_status in ("deleted", "private"):
                # Look up original metadata from our videos table
                video = db.table("videos").select("*").eq(
                    "youtube_video_id", video_id
                ).single().execute()

                original_title = video.data["title"] if video.data else f"Unknown ({video_id})"
                original_channel = video.data.get("channel_name") if video.data else None

                ghost_videos.append({
                    "youtube_video_id": video_id,
                    "original_title": original_title,
                    "original_channel": original_channel,
                    "status": new_status,
                })

            # Update status in our DB
            db.table("playlist_items").update({
                "status": new_status,
            }).eq("playlist_id", playlist_id).eq(
                "youtube_video_id", video_id
            ).execute()
        else:
            # New video added to playlist since last sync
            _upsert_video(db, yt_item)
            db.table("playlist_items").insert({
                "playlist_id": playlist_id,
                "youtube_video_id": video_id,
                "position": yt_item.get("position", 0),
                "status": new_status,
            }).execute()

    # Also check for videos in our DB that no longer appear in the playlist
    current_ids = set(item["youtube_video_id"] for item in current_items)
    for stored_id, stored_item in stored_map.items():
        if stored_id not in current_ids and stored_item["status"] == "active":
            # Video was removed from the playlist entirely
            db.table("playlist_items").update({
                "status": "deleted",
            }).eq("playlist_id", playlist_id).eq(
                "youtube_video_id", stored_id
            ).execute()

            video = db.table("videos").select("*").eq(
                "youtube_video_id", stored_id
            ).single().execute()

            ghost_videos.append({
                "youtube_video_id": stored_id,
                "original_title": video.data["title"] if video.data else f"Unknown ({stored_id})",
                "original_channel": video.data.get("channel_name") if video.data else None,
                "status": "deleted",
            })

    # Update last_synced_at
    now = datetime.now(timezone.utc).isoformat()
    db.table("generated_playlists").update({
        "last_synced_at": now,
    }).eq("id", playlist_id).execute()

    logger.info(
        f"Sync complete for {playlist_id}: {len(ghost_videos)} ghost videos detected"
    )

    return {
        "playlist_id": playlist_id,
        "total_videos": len(current_items),
        "active_videos": sum(1 for i in current_items if i["status"] == "active"),
        "ghost_videos": ghost_videos,
        "last_synced_at": now,
    }


def _upsert_video(db, item: dict):
    """Upsert a video's metadata into the videos table."""
    db.table("videos").upsert({
        "youtube_video_id": item["youtube_video_id"],
        "title": item.get("title", ""),
        "channel_name": item.get("channel_name"),
        "description": item.get("description", ""),
        "thumbnail_url": item.get("thumbnail_url", ""),
        "duration": item.get("duration"),
    }, on_conflict="youtube_video_id").execute()
