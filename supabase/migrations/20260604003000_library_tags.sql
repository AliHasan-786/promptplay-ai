-- Lightweight library organization for saved playlists.

ALTER TABLE public.generated_playlists
  ADD COLUMN IF NOT EXISTS topic_tags TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS generated_playlists_topic_tags_idx
ON public.generated_playlists
USING gin (topic_tags);
