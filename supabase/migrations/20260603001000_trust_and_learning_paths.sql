-- Align the checked-in schema with the shipped app and add structured learning paths.

ALTER TABLE public.generated_playlists
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'ai_generate';

DO $$
BEGIN
  ALTER TABLE public.generated_playlists
    ADD CONSTRAINT generated_playlists_source_check
    CHECK (source IN ('ai_generate', 'playlist_remix', 'import'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS privacy_status TEXT NOT NULL DEFAULT 'public';

DO $$
BEGIN
  ALTER TABLE public.videos
    ADD CONSTRAINT videos_privacy_status_check
    CHECK (privacy_status IN ('public', 'private', 'deleted', 'privacyStatusUnspecified', 'unlisted'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can update their own playlists"
  ON public.generated_playlists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS generated_playlists_user_created_at_idx
ON public.generated_playlists (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.playlist_learning_paths (
  playlist_id UUID PRIMARY KEY REFERENCES public.generated_playlists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  estimated_minutes INTEGER,
  difficulty TEXT
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'mixed')),
  learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.playlist_learning_paths ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  CREATE POLICY "Users can view their own learning paths"
  ON public.playlist_learning_paths FOR SELECT
  USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can create their own learning paths"
  ON public.playlist_learning_paths FOR INSERT
  WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can update their own learning paths"
  ON public.playlist_learning_paths FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Users can delete their own learning paths"
  ON public.playlist_learning_paths FOR DELETE
  USING (auth.uid() = user_id);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS playlist_learning_paths_user_id_idx
ON public.playlist_learning_paths (user_id);

DROP TRIGGER IF EXISTS update_playlist_learning_paths_updated_at
ON public.playlist_learning_paths;

CREATE TRIGGER update_playlist_learning_paths_updated_at
  BEFORE UPDATE ON public.playlist_learning_paths
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
