-- Progress tracking and study mode fields for playlist items.

ALTER TABLE public.playlist_items
  ADD COLUMN IF NOT EXISTS watch_state TEXT NOT NULL DEFAULT 'not_started',
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS learner_note TEXT;

DO $$
BEGIN
  ALTER TABLE public.playlist_items
    ADD CONSTRAINT playlist_items_watch_state_check
    CHECK (watch_state IN ('not_started', 'in_progress', 'completed', 'skipped'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS playlist_items_playlist_watch_state_idx
ON public.playlist_items (playlist_id, watch_state);
