"""YouTube Data API v3 wrapper.

Handles video search, playlist operations, and metadata retrieval
while respecting the 10,000 daily quota limit.
"""

import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3"


class YouTubeAPIError(Exception):
    """Raised when the YouTube API returns an error."""
    pass


async def search_video(
    query: str,
    access_token: Optional[str] = None,
    api_key: Optional[str] = None,
    max_results: int = 1,
) -> Optional[dict]:
    """Search YouTube for a video matching the query.

    Uses 100 quota units per call.

    Args:
        query: Search query string.
        access_token: OAuth access token (user-scoped).
        api_key: API key (for server-side calls without user context).
        max_results: Number of results to return.

    Returns:
        Dict with video info or None if not found.
    """
    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": str(max_results),
    }

    headers = _build_headers(access_token, api_key)

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{YOUTUBE_API_BASE}/search",
            params=params,
            headers=headers,
        )

        if response.status_code != 200:
            logger.error(f"YouTube search error: {response.status_code} {response.text}")
            return None

        data = response.json()
        items = data.get("items", [])
        if not items:
            return None

        item = items[0]
        snippet = item.get("snippet", {})
        return {
            "youtube_video_id": item["id"]["videoId"],
            "title": snippet.get("title", ""),
            "channel_name": snippet.get("channelTitle", ""),
            "description": snippet.get("description", ""),
            "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
        }


async def get_video_details(
    video_ids: list[str],
    access_token: Optional[str] = None,
    api_key: Optional[str] = None,
) -> list[dict]:
    """Get detailed metadata for a list of video IDs.

    Uses 1 quota unit per call (videos.list).

    Args:
        video_ids: List of YouTube video IDs.
        access_token: OAuth access token.
        api_key: API key.

    Returns:
        List of video metadata dicts.
    """
    if not video_ids:
        return []

    params = {
        "part": "snippet,contentDetails,status",
        "id": ",".join(video_ids),
    }

    headers = _build_headers(access_token, api_key)

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{YOUTUBE_API_BASE}/videos",
            params=params,
            headers=headers,
        )

        if response.status_code != 200:
            logger.error(f"YouTube videos.list error: {response.status_code} {response.text}")
            return []

        data = response.json()
        results = []
        for item in data.get("items", []):
            snippet = item.get("snippet", {})
            content = item.get("contentDetails", {})
            results.append({
                "youtube_video_id": item["id"],
                "title": snippet.get("title", ""),
                "channel_name": snippet.get("channelTitle", ""),
                "description": snippet.get("description", ""),
                "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                "duration": content.get("duration", ""),
            })
        return results


async def get_playlist_items(
    playlist_id: str,
    access_token: Optional[str] = None,
    api_key: Optional[str] = None,
    max_results: int = 50,
) -> list[dict]:
    """Fetch all items from a YouTube playlist.

    Uses 1 quota unit per call (playlistItems.list).

    Args:
        playlist_id: YouTube playlist ID.
        access_token: OAuth access token.
        api_key: API key.
        max_results: Max per page (up to 50).

    Returns:
        List of playlist item dicts with video IDs and metadata.
    """
    all_items = []
    page_token = None
    headers = _build_headers(access_token, api_key)

    async with httpx.AsyncClient() as client:
        while True:
            params = {
                "part": "snippet,status",
                "playlistId": playlist_id,
                "maxResults": str(min(max_results, 50)),
            }
            if page_token:
                params["pageToken"] = page_token

            response = await client.get(
                f"{YOUTUBE_API_BASE}/playlistItems",
                params=params,
                headers=headers,
            )

            if response.status_code != 200:
                logger.error(f"YouTube playlistItems error: {response.status_code} {response.text}")
                break

            data = response.json()

            for item in data.get("items", []):
                snippet = item.get("snippet", {})
                status = item.get("status", {})
                video_id = snippet.get("resourceId", {}).get("videoId", "")

                # Determine video status
                privacy = status.get("privacyStatus", "public")
                title = snippet.get("title", "")

                if title == "Deleted video":
                    video_status = "deleted"
                elif title == "Private video" or privacy == "private":
                    video_status = "private"
                else:
                    video_status = "active"

                all_items.append({
                    "youtube_video_id": video_id,
                    "title": title,
                    "channel_name": snippet.get("videoOwnerChannelTitle", ""),
                    "description": snippet.get("description", ""),
                    "thumbnail_url": snippet.get("thumbnails", {}).get("high", {}).get("url", ""),
                    "position": snippet.get("position", 0),
                    "status": video_status,
                })

            page_token = data.get("nextPageToken")
            if not page_token:
                break

    logger.info(f"Fetched {len(all_items)} items from playlist {playlist_id}")
    return all_items


async def create_playlist(
    access_token: str,
    title: str,
    description: str = "",
    privacy: str = "private",
) -> str:
    """Create a new YouTube playlist.

    Uses 50 quota units.

    Returns:
        The playlist ID.
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{YOUTUBE_API_BASE}/playlists",
            params={"part": "snippet,status"},
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            json={
                "snippet": {"title": title, "description": description},
                "status": {"privacyStatus": privacy},
            },
        )

        if response.status_code not in (200, 201):
            raise YouTubeAPIError(f"Failed to create playlist: {response.text}")

        data = response.json()
        playlist_id = data["id"]
        logger.info(f"Created YouTube playlist: {playlist_id}")
        return playlist_id


async def add_video_to_playlist(
    access_token: str,
    playlist_id: str,
    video_id: str,
) -> bool:
    """Add a video to a YouTube playlist.

    Uses 50 quota units.

    Returns:
        True if successful, False otherwise.
    """
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{YOUTUBE_API_BASE}/playlistItems",
            params={"part": "snippet"},
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            json={
                "snippet": {
                    "playlistId": playlist_id,
                    "resourceId": {"kind": "youtube#video", "videoId": video_id},
                },
            },
        )

        if response.status_code not in (200, 201):
            logger.warning(f"Failed to add video {video_id} to playlist: {response.text}")
            return False
        return True


def extract_playlist_id(url: str) -> Optional[str]:
    """Extract the playlist ID from a YouTube playlist URL.

    Handles formats:
    - https://www.youtube.com/playlist?list=PLxxxxxx
    - https://youtube.com/playlist?list=PLxxxxxx
    """
    from urllib.parse import urlparse, parse_qs

    try:
        parsed = urlparse(url)
        qs = parse_qs(parsed.query)
        return qs.get("list", [None])[0]
    except Exception:
        return None


def _build_headers(
    access_token: Optional[str] = None,
    api_key: Optional[str] = None,
) -> dict:
    """Build HTTP headers for YouTube API calls."""
    headers = {}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    # Note: if using API key, it should be passed as a query param, not header
    return headers
