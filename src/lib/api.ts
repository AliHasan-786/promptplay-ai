/**
 * API client for the FastAPI backend.
 * 
 * Falls back to Supabase Edge Functions if the backend is unavailable,
 * ensuring the app works in both development configurations.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

interface FetchOptions {
    method?: string;
    body?: unknown;
    token?: string;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
    const { method = "GET", body, token } = options;

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API error: ${response.status}`);
    }

    return response.json();
}

// ─── Types ─────────────────────────────────────────────

export interface Video {
    youtube_video_id: string;
    title: string;
    channel_name?: string | null;
    description?: string | null;
    thumbnail_url?: string | null;
    duration?: string | null;
}

export interface PlaylistItem {
    id: string;
    youtube_video_id: string;
    position?: number | null;
    status: "active" | "deleted" | "private";
    added_at: string;
    video?: Video | null;
}

export interface Playlist {
    id: string;
    user_id: string;
    prompt_text: string;
    youtube_playlist_id?: string | null;
    semantic_topic?: string | null;
    last_synced_at?: string | null;
    created_at: string;
    items: PlaylistItem[];
}

export interface GeneratedVideo {
    title: string;
    artist: string;
    youtube_video_id?: string | null;
    channel_name?: string | null;
    thumbnail_url?: string | null;
}

export interface GenerateResponse {
    playlist_id: string;
    videos: GeneratedVideo[];
    youtube_playlist_url?: string | null;
}

export interface GhostVideo {
    youtube_video_id: string;
    original_title: string;
    original_channel?: string | null;
    status: "deleted" | "private";
    recovery_suggestions?: Video[];
}

export interface SyncResponse {
    playlist_id: string;
    total_videos: number;
    active_videos: number;
    ghost_videos: GhostVideo[];
    last_synced_at: string;
}

export interface ImportResponse {
    playlist_id: string;
    title: string;
    total_videos: number;
    active_videos: number;
    deleted_videos: number;
    private_videos: number;
}

export interface SuggestionResponse {
    suggestions: Video[];
    based_on_topic?: string | null;
}

// ─── API Functions ─────────────────────────────────────

export const api = {
    /** Generate a playlist from a natural language prompt */
    async generatePlaylist(prompt: string, maxVideos: number = 10, token?: string): Promise<GenerateResponse> {
        return apiFetch<GenerateResponse>("/api/generate", {
            method: "POST",
            body: { prompt, max_videos: maxVideos },
            token,
        });
    },

    /** List all playlists for the authenticated user */
    async listPlaylists(token: string): Promise<Playlist[]> {
        return apiFetch<Playlist[]>("/api/playlists", { token });
    },

    /** Get a single playlist with all items */
    async getPlaylist(playlistId: string, token: string): Promise<Playlist> {
        return apiFetch<Playlist>(`/api/playlists/${playlistId}`, { token });
    },

    /** Import an existing YouTube playlist */
    async importPlaylist(youtubeUrl: string, accessToken: string, token: string): Promise<ImportResponse> {
        return apiFetch<ImportResponse>("/api/playlists/import", {
            method: "POST",
            body: { youtube_playlist_url: youtubeUrl, access_token: accessToken },
            token,
        });
    },

    /** Sync a playlist with YouTube to detect ghost videos */
    async syncPlaylist(playlistId: string, accessToken: string, token: string): Promise<SyncResponse> {
        return apiFetch<SyncResponse>(`/api/playlists/${playlistId}/sync`, {
            method: "POST",
            body: { access_token: accessToken },
            token,
        });
    },

    /** Export a playlist to YouTube */
    async exportToYouTube(
        playlistId: string,
        accessToken: string,
        playlistName?: string,
        token?: string,
    ) {
        return apiFetch<{
            youtube_playlist_id: string;
            youtube_playlist_url: string;
            videos_added: number;
            videos_failed: number;
            was_limited: boolean;
        }>(`/api/playlists/${playlistId}/export`, {
            method: "POST",
            body: {
                playlist_id: playlistId,
                access_token: accessToken,
                playlist_name: playlistName,
            },
            token,
        });
    },

    /** Get semantic video suggestions for a playlist */
    async getSuggestions(playlistId: string, count: number = 5, token?: string): Promise<SuggestionResponse> {
        return apiFetch<SuggestionResponse>("/api/suggestions", {
            method: "POST",
            body: { playlist_id: playlistId, count },
            token,
        });
    },

    /** Delete a playlist */
    async deletePlaylist(playlistId: string, token: string): Promise<void> {
        await apiFetch(`/api/playlists/${playlistId}`, {
            method: "DELETE",
            token,
        });
    },

    /** Health check */
    async health() {
        return apiFetch<{ status: string; llm_provider: string }>("/api/health");
    },
};
