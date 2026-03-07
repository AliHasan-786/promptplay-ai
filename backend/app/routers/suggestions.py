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
from app.config import get_settings

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
    if not authorization:
        raise HTTPException(status_code=401, detail="Authentication required")

    settings = get_settings()
    db = get_supabase_client()

    # Get playlist items
    items = db.table("playlist_items").select("youtube_video_id").eq(
        "playlist_id", request.playlist_id
    ).eq("status", "active").execute()

    if not items.data:
        raise HTTPException(status_code=404, detail="No active videos in playlist")

    existing_video_ids = set(item["youtube_video_id"] for item in items.data)

    # Get video metadata for embedding
    videos = []
    for item in items.data:
        video = db.table("videos").select("*").eq(
            "youtube_video_id", item["youtube_video_id"]
        ).single().execute()
        if video.data:
            videos.append(video.data)

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

        suggestions = []
        for match in result.data:
            # Skip videos already in the playlist
            if match["youtube_video_id"] in existing_video_ids:
                continue

            # Get full video metadata
            video = db.table("videos").select("*").eq(
                "youtube_video_id", match["youtube_video_id"]
            ).single().execute()

            if video.data:
                suggestions.append(VideoBase(
                    youtube_video_id=video.data["youtube_video_id"],
                    title=video.data["title"],
                    channel_name=video.data.get("channel_name"),
                    description=video.data.get("description"),
                    thumbnail_url=video.data.get("thumbnail_url"),
                    duration=video.data.get("duration"),
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
