"""LLM integration service for conversational playlist generation.

Uses the user's LLMAPI endpoint (OpenAI-compatible) to translate
natural language prompts into structured video suggestion lists.
"""

import json
import logging
import httpx
from app.config import get_settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are an AI-powered YouTube Playlist curator. Your job is to take a user's natural language request and return a structured JSON list of YouTube videos to search for.

RULES:
1. Return ONLY a valid JSON array of objects.
2. Each object must have: "title" (the video/song title), "artist" (creator/composer/channel).
3. Optionally include "search_query" — an optimized YouTube search string.
4. For music requests, use actual composer/artist names.
5. For educational content, use the actual channel/creator name.
6. Generate the number of results the user asks for, defaulting to 10.
7. Do NOT include duplicates.
8. Return ONLY the JSON array — no markdown, no explanation.

Example output:
[
  {"title": "Beneath the Mask", "artist": "Lyn (Persona 5 OST)", "search_query": "Beneath the Mask Persona 5 OST official"},
  {"title": "Neural Networks Explained", "artist": "3Blue1Brown", "search_query": "3Blue1Brown neural networks explained"}
]"""


async def generate_video_list(
    prompt: str,
    max_videos: int = 10,
) -> list[dict]:
    """Use the configured LLM to generate a list of video suggestions.

    Args:
        prompt: The user's natural language request.
        max_videos: Maximum number of videos to generate.

    Returns:
        List of dicts with 'title', 'artist', and optionally 'search_query'.
    """
    settings = get_settings()

    if not settings.llmapi_key:
        raise ValueError("LLMAPI_KEY is not configured")

    user_message = f"{prompt}\n\nPlease return exactly {max_videos} results."

    # Call the OpenAI-compatible LLMAPI endpoint
    # The base_url already includes `/v1/chat/completions`
    base_url = settings.llmapi_base_url.rstrip("/")

    # If the URL already ends with /chat/completions, use it directly
    # Otherwise append the standard OpenAI path
    if base_url.endswith("/chat/completions"):
        url = base_url
    else:
        url = f"{base_url}/chat/completions"

    payload = {
        "model": settings.llmapi_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        "temperature": 0.7,
    }

    headers = {
        "Authorization": f"Bearer {settings.llmapi_key}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(url, json=payload, headers=headers)

        if response.status_code != 200:
            logger.error(f"LLM API error: {response.status_code} {response.text}")

            if response.status_code == 429:
                raise ValueError("Rate limit exceeded. Please try again later.")
            if response.status_code == 402:
                raise ValueError("API credits exhausted.")

            raise ValueError(f"LLM API returned status {response.status_code}")

        data = response.json()

    content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    if not content:
        raise ValueError("LLM returned empty response")

    return _parse_llm_response(content)


def _parse_llm_response(content: str) -> list[dict]:
    """Parse and validate the LLM's JSON response."""
    # Strip markdown code fences if present
    text = content.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    try:
        videos = json.loads(text)
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response: {e}\nContent: {content}")
        raise ValueError("LLM returned invalid JSON. Please try again.")

    if not isinstance(videos, list):
        raise ValueError("LLM response is not a list.")

    # Validate structure
    validated = []
    for v in videos:
        if isinstance(v, dict) and "title" in v and "artist" in v:
            validated.append({
                "title": str(v["title"]),
                "artist": str(v["artist"]),
                "search_query": str(v.get("search_query", f"{v['artist']} {v['title']}")),
            })

    if not validated:
        raise ValueError("LLM returned no valid video entries.")

    logger.info(f"LLM generated {len(validated)} video suggestions")
    return validated
