# QA Memory — PromptPlay AI

## Project Architecture (verified)
- Frontend: React + Vite + TypeScript, Tailwind, Supabase client
- Auth: Firebase Google OAuth → Supabase signInWithIdToken (dual-token flow)
- Backend: FastAPI (Python) — `/backend/app/`
- Edge Functions: Deno/Supabase — `supabase/functions/`
- DB: Supabase (PostgreSQL) — two playlist schemas coexist: `generated_playlists`+`playlist_songs` (frontend/edge functions) and `generated_playlists`+`playlist_items`+`videos` (backend API)

## Recurring Bug Patterns
- **Schema split (CONFIRMED ACTIVE)**: `youtube-import-playlist` edge function writes to `playlist_songs` table; frontend `ChatInterface.tsx` writes to `playlist_items`+`videos`; backend Python API reads from `playlist_items`+`videos`. Data written by `youtube-import-playlist` edge function is INVISIBLE to `PlaylistDashboard.tsx` and all backend API endpoints. Critical data consistency bug.
- **N+1 query pattern (FIXED)**: `playlists.py` list_playlists now batches all items and videos in two queries. Fixed.
- **CORS wildcard (CONFIRMED ACTIVE)**: Both Supabase edge functions still use `Access-Control-Allow-Origin: *`.
- **Rate limit bypass (FIXED)**: `generate-playlist` now returns 401 if userId is null. Fixed.
- **Sync ownership check (FIXED)**: `sync_playlist` in `playlist_sync.py` now does `.eq("user_id", user_id)` before syncing. Fixed.
- **Suggestions ownership check (FIXED)**: `suggestions.py` now verifies playlist ownership before returning suggestions. Fixed.
- **Access token in request body (CONFIRMED ACTIVE)**: `access_token` in `ImportPlaylistRequest` and `SyncPlaylistRequest` still sent in JSON body, not headers.
- **Error message leakage (CONFIRMED ACTIVE)**: `youtube-import-playlist` edge function still re-throws raw exception messages (YouTube API errors, Supabase errors) in status 400 responses.
- **No prompt length limit in edge function**: `generate-playlist` accepts unbounded prompt strings — only validated client-side.
- **PlaylistDashboard delete race**: Delete fires immediately on click with no confirmation; no guard against double-click.
- **generate-playlist rate limit uses created_at not generation timestamp**: getDailyCount counts all playlists created today (including imported/recommendation-generated ones), which skews the quota unintentionally.
- **ExportToYouTubeRequest.playlist_id redundant**: playlist_id is both a URL path param AND inside the request body schema — divergence risk if caller provides different values.

## Known Fragile Areas
- `youtube-import-playlist/index.ts`: writes to `playlist_songs` while all other code uses `playlist_items`+`videos` — silent data split
- `PlaylistDashboard.tsx`: delete has no confirmation dialog — accidental deletes are easy; no optimistic rollback guard
- `useAuth.tsx`: race condition — `getSession()` and `onAuthStateChange` both set state; winner depends on timing; provider_token can be stale after token refresh
- `generate-playlist/index.ts`: LLM response parsing relies on regex to extract JSON — fragile if model returns markdown fences
- `playlists.py` export_to_youtube: playlist_id in path is used to fetch the playlist, but ExportToYouTubeRequest also has a playlist_id field that is never validated against the path param
- `playlist_sync.py` import_playlist: if DB insert of playlist record succeeds but a later video upsert fails, the playlist record is left orphaned (no rollback)

## Files of Interest
- `/backend/app/routers/playlists.py` — main CRUD router
- `/backend/app/routers/suggestions.py` — vector similarity endpoint
- `/backend/app/services/playlist_sync.py` — import/sync logic
- `/supabase/functions/generate-playlist/index.ts` — LLM + YouTube search edge function
- `/supabase/functions/youtube-import-playlist/index.ts` — YouTube import edge function
- `/src/hooks/useAuth.tsx` — auth state management
