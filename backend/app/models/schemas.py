"""Pydantic models (schemas) for API request/response validation."""

from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


# ─── Enums ────────────────────────────────────────────────

class VideoStatus(str, Enum):
    active = "active"
    deleted = "deleted"
    private = "private"


# ─── Video Models ─────────────────────────────────────────

class VideoBase(BaseModel):
    youtube_video_id: str
    title: str
    channel_name: Optional[str] = None
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    duration: Optional[str] = None


class VideoResponse(VideoBase):
    id: str
    created_at: str
    updated_at: str


# ─── Playlist Models ─────────────────────────────────────

class PlaylistItemResponse(BaseModel):
    id: str
    youtube_video_id: str
    position: Optional[int] = None
    status: VideoStatus = VideoStatus.active
    added_at: str
    # Joined video metadata
    video: Optional[VideoBase] = None


class PlaylistResponse(BaseModel):
    id: str
    user_id: str
    prompt_text: str
    youtube_playlist_id: Optional[str] = None
    semantic_topic: Optional[str] = None
    last_synced_at: Optional[str] = None
    created_at: str
    items: list[PlaylistItemResponse] = []


# ─── Generation Models ───────────────────────────────────

class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=3, max_length=1000)
    max_videos: int = Field(default=10, ge=1, le=20)


class GeneratedVideo(BaseModel):
    title: str
    artist: str
    youtube_video_id: Optional[str] = None
    channel_name: Optional[str] = None
    thumbnail_url: Optional[str] = None


class GenerateResponse(BaseModel):
    playlist_id: str
    videos: list[GeneratedVideo]
    youtube_playlist_url: Optional[str] = None


# ─── Import Models ────────────────────────────────────────

class ImportPlaylistRequest(BaseModel):
    youtube_playlist_url: str = Field(..., description="Full YouTube playlist URL")
    access_token: str = Field(..., description="User's YouTube OAuth access token")


class ImportPlaylistResponse(BaseModel):
    playlist_id: str
    title: str
    total_videos: int
    active_videos: int
    deleted_videos: int
    private_videos: int


# ─── Sync / Ghost Video Models ───────────────────────────

class SyncPlaylistRequest(BaseModel):
    access_token: str


class GhostVideo(BaseModel):
    youtube_video_id: str
    original_title: str
    original_channel: Optional[str] = None
    status: VideoStatus
    recovery_suggestions: list[VideoBase] = []


class SyncPlaylistResponse(BaseModel):
    playlist_id: str
    total_videos: int
    active_videos: int
    ghost_videos: list[GhostVideo] = []
    last_synced_at: str


# ─── Suggestion Models ───────────────────────────────────

class SuggestionRequest(BaseModel):
    playlist_id: str
    count: int = Field(default=5, ge=1, le=20)


class SuggestionResponse(BaseModel):
    suggestions: list[VideoBase]
    based_on_topic: Optional[str] = None


# ─── YouTube Export Models ────────────────────────────────

class ExportToYouTubeRequest(BaseModel):
    playlist_id: str
    access_token: str
    playlist_name: Optional[str] = None


class ExportToYouTubeResponse(BaseModel):
    youtube_playlist_id: str
    youtube_playlist_url: str
    videos_added: int
    videos_failed: int
    was_limited: bool = False
