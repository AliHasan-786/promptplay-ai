"""Ghost Video recovery service.

When videos are deleted from YouTube, this service attempts to recover
their original metadata by querying the Internet Archive's Wayback Machine
and falling back to a Google search.
"""

import logging
from typing import Optional
import httpx

logger = logging.getLogger(__name__)

WAYBACK_API = "https://archive.org/wayback/available"


async def recover_video_title(youtube_video_id: str) -> Optional[dict]:
    """Attempt to recover metadata for a deleted YouTube video.

    Strategy:
    1. Query the Wayback Machine for an archived snapshot of the video page.
    2. If found, parse the page title to extract the video title.
    3. If not found via Wayback, try a Google search for the video ID.

    Args:
        youtube_video_id: The 11-character YouTube video ID.

    Returns:
        Dict with recovered 'title' and possibly 'channel_name', or None.
    """
    # Strategy 1: Wayback Machine
    result = await _try_wayback(youtube_video_id)
    if result:
        logger.info(f"Recovered metadata via Wayback Machine for {youtube_video_id}")
        return result

    # Strategy 2: Google Search (via a simple web scrape approach)
    result = await _try_web_search(youtube_video_id)
    if result:
        logger.info(f"Recovered metadata via web search for {youtube_video_id}")
        return result

    logger.warning(f"Could not recover metadata for {youtube_video_id}")
    return None


async def _try_wayback(video_id: str) -> Optional[dict]:
    """Check the Wayback Machine for an archived version of the video page."""
    video_url = f"https://www.youtube.com/watch?v={video_id}"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                WAYBACK_API,
                params={"url": video_url, "timestamp": "20240101"},
            )

            if response.status_code != 200:
                return None

            data = response.json()
            snapshot = data.get("archived_snapshots", {}).get("closest")

            if not snapshot or not snapshot.get("available"):
                return None

            # Fetch the archived page to extract the title
            archive_url = snapshot["url"]
            page_response = await client.get(archive_url, follow_redirects=True)

            if page_response.status_code != 200:
                return None

            # Extract title from HTML <title> tag
            html = page_response.text
            title = _extract_title_from_html(html)

            if title:
                # YouTube titles are typically "Video Title - YouTube"
                clean_title = title.replace(" - YouTube", "").strip()
                return {
                    "title": clean_title,
                    "channel_name": None,  # Hard to extract reliably
                    "source": "wayback_machine",
                }

    except Exception as e:
        logger.debug(f"Wayback Machine lookup failed for {video_id}: {e}")

    return None


async def _try_web_search(video_id: str) -> Optional[dict]:
    """Try to find the original video title via web search.

    Uses a simple approach: search for the video ID and look for
    cached results that contain the original title.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Try a direct search using the video ID
            # Many sites cache YouTube video titles and can be found this way
            search_url = f"https://noembed.com/embed?url=https://www.youtube.com/watch?v={video_id}"

            response = await client.get(search_url)
            if response.status_code == 200:
                data = response.json()
                title = data.get("title")
                author = data.get("author_name")

                if title and title not in ("", "YouTube"):
                    return {
                        "title": title,
                        "channel_name": author,
                        "source": "noembed",
                    }

    except Exception as e:
        logger.debug(f"Web search recovery failed for {video_id}: {e}")

    return None


def _extract_title_from_html(html: str) -> Optional[str]:
    """Extract the <title> tag content from HTML."""
    import re

    match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
    if match:
        return match.group(1).strip()
    return None
