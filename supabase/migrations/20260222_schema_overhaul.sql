-- =============================================================
-- Schema Overhaul: AI YouTube Playlist Manager
-- Enables pgvector, creates videos + video_embeddings tables,
-- adds playlist_items with status tracking, and updates
-- generated_playlists with YouTube-specific fields.
-- =============================================================

-- 1. Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Global video metadata store (immune to YouTube deletions)
CREATE TABLE IF NOT EXISTS public.videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_video_id TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    channel_name TEXT,
    description TEXT,
    thumbnail_url TEXT,
    duration TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Videos are readable by authenticated users (shared metadata)
CREATE POLICY "Authenticated users can read videos"
ON public.videos FOR SELECT
TO authenticated
USING (true);

-- Only service role (backend) inserts/updates videos
CREATE POLICY "Service role can manage videos"
ON public.videos FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_videos_updated_at
    BEFORE UPDATE ON public.videos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Vector embeddings for semantic search
CREATE TABLE IF NOT EXISTS public.video_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    youtube_video_id TEXT UNIQUE NOT NULL REFERENCES public.videos(youtube_video_id) ON DELETE CASCADE,
    embedding vector(1536),  -- OpenAI text-embedding-3-small dimension
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.video_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read embeddings"
ON public.video_embeddings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can manage embeddings"
ON public.video_embeddings FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Index for fast cosine similarity searches
CREATE INDEX IF NOT EXISTS video_embeddings_embedding_idx
ON public.video_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 4. Add YouTube-specific columns to generated_playlists
ALTER TABLE public.generated_playlists
    ADD COLUMN IF NOT EXISTS youtube_playlist_id TEXT,
    ADD COLUMN IF NOT EXISTS semantic_topic TEXT,
    ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- 5. Playlist items junction table with status tracking
-- This replaces the old playlist_songs table for new playlists
CREATE TABLE IF NOT EXISTS public.playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.generated_playlists(id) ON DELETE CASCADE,
    youtube_video_id TEXT NOT NULL,
    position INTEGER,
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'deleted', 'private')),
    added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(playlist_id, youtube_video_id)
);

ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

-- Users can view items from their own playlists
CREATE POLICY "Users can view items from their playlists"
ON public.playlist_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.generated_playlists
        WHERE id = playlist_items.playlist_id
        AND user_id = auth.uid()
    )
);

-- Users can insert items to their own playlists
CREATE POLICY "Users can insert items to their playlists"
ON public.playlist_items FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.generated_playlists
        WHERE id = playlist_items.playlist_id
        AND user_id = auth.uid()
    )
);

-- Users can update items in their playlists
CREATE POLICY "Users can update items in their playlists"
ON public.playlist_items FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.generated_playlists
        WHERE id = playlist_items.playlist_id
        AND user_id = auth.uid()
    )
);

-- Users can delete items from their own playlists
CREATE POLICY "Users can delete items from their playlists"
ON public.playlist_items FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.generated_playlists
        WHERE id = playlist_items.playlist_id
        AND user_id = auth.uid()
    )
);

-- 6. Useful database function: match videos by embedding similarity
CREATE OR REPLACE FUNCTION public.match_videos(
    query_embedding vector(1536),
    match_threshold FLOAT DEFAULT 0.7,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    youtube_video_id TEXT,
    title TEXT,
    channel_name TEXT,
    similarity FLOAT
)
LANGUAGE sql STABLE
AS $$
    SELECT
        v.youtube_video_id,
        v.title,
        v.channel_name,
        1 - (ve.embedding <=> query_embedding) AS similarity
    FROM public.video_embeddings ve
    JOIN public.videos v ON v.youtube_video_id = ve.youtube_video_id
    WHERE 1 - (ve.embedding <=> query_embedding) > match_threshold
    ORDER BY ve.embedding <=> query_embedding
    LIMIT match_count;
$$;
