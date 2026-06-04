-- Public path pages: visibility, share slugs, and public read policies.

ALTER TABLE public.generated_playlists
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS public_slug TEXT,
  ADD COLUMN IF NOT EXISTS public_description TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

DO $$
BEGIN
  ALTER TABLE public.generated_playlists
    ADD CONSTRAINT generated_playlists_visibility_check
    CHECK (visibility IN ('private', 'public'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS generated_playlists_public_slug_idx
ON public.generated_playlists (public_slug)
WHERE public_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS generated_playlists_visibility_published_at_idx
ON public.generated_playlists (visibility, published_at DESC);

CREATE INDEX IF NOT EXISTS playlist_items_youtube_video_id_idx
ON public.playlist_items (youtube_video_id);

DO $$
BEGIN
  CREATE POLICY "Anyone can view public playlists"
  ON public.generated_playlists FOR SELECT
  USING (visibility = 'public');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Anyone can view public learning paths"
  ON public.playlist_learning_paths FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.generated_playlists gp
      WHERE gp.id = playlist_learning_paths.playlist_id
        AND gp.visibility = 'public'
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Anyone can view items from public playlists"
  ON public.playlist_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.generated_playlists gp
      WHERE gp.id = playlist_items.playlist_id
        AND gp.visibility = 'public'
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE POLICY "Anyone can read videos from public playlists"
  ON public.videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.playlist_items pi
      JOIN public.generated_playlists gp
        ON gp.id = pi.playlist_id
      WHERE pi.youtube_video_id = videos.youtube_video_id
        AND gp.visibility = 'public'
    )
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
