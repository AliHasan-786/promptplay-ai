"""Playlist generation router.

Handles conversational playlist generation: takes a natural language prompt,
uses the LLM to generate video suggestions, searches YouTube for matches,
snapshots metadata, generates embeddings, and returns the result.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Header
from typing import Optional

from app.models.schemas import GenerateRequest, GenerateResponse, GeneratedVideo
from app.services import llm, youtube_api, embeddings as embed_service
from app.db.supabase_client import get_supabase_client
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/generate", tags=["generate"])


@router.post("", response_model=GenerateResponse)
async def generate_playlist(
    request: GenerateRequest,
    authorization: Optional[str] = Header(None),
):
    """Generate an AI-curated playlist from a natural language prompt.

    Flow:
    1. LLM generates a list of video suggestions from the prompt.
    2. For each suggestion, search YouTube to find the best matching video.
    3. Snapshot all video metadata in our database.
    4. Generate and store embeddings for semantic search.
    5. Create a playlist record and return the results.
    """
    settings = get_settings()

    # Extract user from Supabase auth header
    user_id = await _get_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        # Step 1: Generate video list via LLM
        suggestions = await llm.generate_video_list(
            request.prompt,
            max_videos=request.max_videos,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"LLM generation failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate playlist")

    db = get_supabase_client()

    # Step 2: Create playlist record
    playlist_result = db.table("generated_playlists").insert({
        "user_id": user_id,
        "prompt_text": request.prompt,
        "semantic_topic": request.prompt,  # Use prompt as initial topic
        "last_synced_at": datetime.now(timezone.utc).isoformat(),
    }).execute()

    playlist_id = playlist_result.data[0]["id"]

    # Step 3: Search YouTube and snapshot metadata
    videos = []
    embedding_texts = []

    for idx, suggestion in enumerate(suggestions):
        search_query = suggestion.get("search_query", f"{suggestion['artist']} {suggestion['title']}")

        # Search YouTube (100 quota units per search)
        yt_result = await youtube_api.search_video(
            search_query,
            api_key=settings.youtube_api_key,
        )

        if yt_result:
            video_id = yt_result["youtube_video_id"]

            # Snapshot metadata
            db.table("videos").upsert({
                "youtube_video_id": video_id,
                "title": yt_result["title"],
                "channel_name": yt_result["channel_name"],
                "description": yt_result.get("description", ""),
                "thumbnail_url": yt_result.get("thumbnail_url", ""),
            }, on_conflict="youtube_video_id").execute()

            # Create playlist item
            db.table("playlist_items").upsert({
                "playlist_id": playlist_id,
                "youtube_video_id": video_id,
                "position": idx,
                "status": "active",
            }, on_conflict="playlist_id,youtube_video_id").execute()

            # Build embedding text
            embed_text = embed_service.build_embedding_text(
                yt_result["title"],
                yt_result.get("channel_name"),
                yt_result.get("description"),
            )
            embedding_texts.append((video_id, embed_text))

            videos.append(GeneratedVideo(
                title=yt_result["title"],
                artist=yt_result.get("channel_name", suggestion["artist"]),
                youtube_video_id=video_id,
                channel_name=yt_result.get("channel_name"),
                thumbnail_url=yt_result.get("thumbnail_url"),
            ))
        else:
            # YouTube search failed — still return the LLM suggestion
            videos.append(GeneratedVideo(
                title=suggestion["title"],
                artist=suggestion["artist"],
            ))

    # Step 4: Generate and store embeddings (async, non-blocking for response)
    if embedding_texts and settings.openai_api_key:
        try:
            texts = [t for _, t in embedding_texts]
            video_ids = [vid for vid, _ in embedding_texts]
            embeds = await embed_service.generate_batch_embeddings(texts)

            for vid, emb in zip(video_ids, embeds):
                db.table("video_embeddings").upsert({
                    "youtube_video_id": vid,
                    "embedding": emb,
                    "metadata": {},
                }, on_conflict="youtube_video_id").execute()
        except Exception as e:
            # Embedding failure shouldn't break the main flow
            logger.warning(f"Embedding generation failed (non-critical): {e}")

    logger.info(f"Generated playlist {playlist_id} with {len(videos)} videos")

    return GenerateResponse(
        playlist_id=playlist_id,
        videos=videos,
    )


async def _get_user_id(authorization: Optional[str]) -> Optional[str]:
    """Extract user ID from the Supabase JWT in the Authorization header."""
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
