"""Semantic video suggestions router.

Uses vector embeddings to recommend videos similar to an existing playlist's
content profile.
"""

import logging
from fastapi import APIRouter, HTTPException, Header
from typing import Optional

from app.models.schemas import SuggestionRequest, SuggestionResponse, VideoBase
from app.services import embeddings as embed_service
from app.db.supabase_client import get_supabase_client
from app.routers.playlists import _get_user_id

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/suggestions", tags=["suggestions"])


@router.post("", response_model=SuggestionResponse)
async def get_suggestions(
    request: SuggestionRequest,
    authorization: Optional[str] = Header(None),
):
    """Get semantically similar video suggestions for a playlist.

    Flow:
    1. Fetch the playlist's video metadata.
    2. Generate a combined embedding from the playlist's content.
    3. Query the vector database for similar videos not already in the playlist.
    4. Return ranked suggestions.
    """
    user_id = await _get_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    db = get_supabase_client()

    # Verify playlist ownership before accessing its contents
    ownership = db.table("generated_playlists").select("id").eq(
        "id", request.playlist_id
    ).eq("user_id", user_id).single().execute()
    if not ownership.data:
        raise HTTPException(status_code=404, detail="Playlist not found")

    # Get playlist items
    items = db.table("playlist_items").select("youtube_video_id").eq(
        "playlist_id", request.playlist_id
    ).eq("status", "active").execute()

    if not items.data:
        raise HTTPException(status_code=404, detail="No active videos in playlist")

    existing_video_ids = set(item["youtube_video_id"] for item in items.data)

    # WARNING-2: Batch fetch all video metadata in one query instead of N+1 queries
    video_ids = [item["youtube_video_id"] for item in items.data]
    videos_result = db.table("videos").select("*").in_("youtube_video_id", video_ids).execute()
    videos_map = {v["youtube_video_id"]: v for v in (videos_result.data or [])}

    videos = [videos_map[vid_id] for vid_id in video_ids if vid_id in videos_map]

    if not videos:
        raise HTTPException(status_code=404, detail="No video metadata found")

    # Build combined embedding text from playlist
    combined_text = " | ".join(
        embed_service.build_embedding_text(
            v["title"],
            v.get("channel_name"),
            v.get("description"),
        )
        for v in videos[:10]  # Limit to avoid excessive token usage
    )

    # Get the semantic topic
    playlist = db.table("generated_playlists").select("semantic_topic").eq(
        "id", request.playlist_id
    ).single().execute()
    topic = playlist.data.get("semantic_topic") if playlist.data else None

    try:
        # Generate query embedding
        query_embedding = await embed_service.generate_embedding(combined_text[:2000])

        # Query for similar videos using the match_videos function
        result = db.rpc("match_videos", {
            "query_embedding": query_embedding,
            "match_threshold": 0.5,
            "match_count": request.count + len(existing_video_ids),  # Fetch extra to filter
        }).execute()

        # WARNING-2: Batch fetch all matched video metadata in one query
        match_ids = [m["youtube_video_id"] for m in result.data]
        matched_videos_result = db.table("videos").select("*").in_("youtube_video_id", match_ids).execute()
        matched_videos_map = {v["youtube_video_id"]: v for v in (matched_videos_result.data or [])}

        suggestions = []
        for match in result.data:
            # Skip videos already in the playlist
            if match["youtube_video_id"] in existing_video_ids:
                continue

            video_data = matched_videos_map.get(match["youtube_video_id"])
            if video_data:
                suggestions.append(VideoBase(
                    youtube_video_id=video_data["youtube_video_id"],
                    title=video_data["title"],
                    channel_name=video_data.get("channel_name"),
                    description=video_data.get("description"),
                    thumbnail_url=video_data.get("thumbnail_url"),
                    duration=video_data.get("duration"),
                ))

            if len(suggestions) >= request.count:
                break

        return SuggestionResponse(
            suggestions=suggestions,
            based_on_topic=topic,
        )

    except Exception as e:
        logger.error(f"Suggestion generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate suggestions. Ensure embeddings are available.",
        )
