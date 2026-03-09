# Post-Review Fixes Plan
**Branch**: `fix/post-review-fixes`
**Date**: 2026-03-09

## Context
Fixes for all critical and warning findings from the March 9 code review.
14 issues addressed across 2 edge functions, 4 backend files, and 4 frontend components.

## Steps

### CRITICAL-1: Schema split — youtube-import-playlist writes to wrong table
**File**: `supabase/functions/youtube-import-playlist/index.ts`
Replace `playlist_songs` insert with upsert into `videos` + insert into `playlist_items`.
Use `onConflict: 'youtube_video_id'` for videos upsert to handle shared videos across playlists.

### CRITICAL-2: OAuth tokens in request body → move to header
**Files**: `supabase/functions/youtube-import-playlist/index.ts`, `src/components/ImportPlaylistDialog.tsx`, `backend/app/routers/playlists.py`, `backend/app/models/schemas.py`
Read `youtube_access_token` from `X-YouTube-Token` header instead of request body.
Update frontend to pass token as header. Remove `access_token` from Pydantic models.

### CRITICAL-3: Sanitize error responses — both edge functions
**Files**: `supabase/functions/youtube-import-playlist/index.ts`, `supabase/functions/generate-playlist/index.ts`
Replace raw `error.message` in outer catch with a generic "An unexpected error occurred" message.
Log full error server-side via `console.error`.

### CRITICAL-4: Fix authHeader non-null assertion crash
**File**: `supabase/functions/youtube-import-playlist/index.ts`
Validate `authHeader` before use. Return 401 if missing; remove the `!` non-null assertion.

### CRITICAL-5: Fix Auth.tsx page structure
**File**: `src/pages/Auth.tsx`
Add tagline, description, and rename button to "Sign in with Google".

### WARNING-1: No rollback in import_playlist on partial failure
**File**: `backend/app/services/playlist_sync.py`
Wrap item processing loop in try/except that deletes the orphaned playlist record on failure.

### WARNING-2: N+1 queries in suggestions.py — batch with .in_()
**File**: `backend/app/routers/suggestions.py`
Replace per-item DB queries with two batched `.in_()` queries and a lookup map.

### WARNING-3: Sequential YouTube export → use asyncio.gather()
**File**: `backend/app/routers/playlists.py`
Replace sequential for-loop with `asyncio.gather()` for parallel video adds.

### WARNING-4: _get_user_id creates new Supabase client per request
**File**: `backend/app/routers/playlists.py`
Move `from supabase import create_client` to the top of the file. Module-level import.

### WARNING-5: Rate limit response returns HTTP 200 instead of 429
**File**: `supabase/functions/generate-playlist/index.ts`
Add `status: 429` to the daily limit response.

### WARNING-6: ESLint silences no-unused-vars globally
**File**: `eslint.config.js`
Change `"off"` to `["warn", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }]`.

### WARNING-7: No server-side prompt length cap
**File**: `supabase/functions/generate-playlist/index.ts`
Add a 2000-character check on the prompt after extraction, return 400 if exceeded.

### WARNING-8: URL validation before new URL() parse
**File**: `supabase/functions/youtube-import-playlist/index.ts`
Wrap URL parsing in try/catch with user-friendly messages. Extract `playlistId` safely.

### WARNING-9: Rate limit counts all playlists, not just AI-generated
**File**: `supabase/functions/generate-playlist/index.ts`
Add `.eq('source', 'ai_generate')` filter to the daily count query.
Add `source: 'ai_generate'` to playlist insert. Note: requires a DB migration.

### WARNING-10: Delete confirmation dialog
**File**: `src/components/PlaylistDashboard.tsx`
Add `window.confirm()` guard before the delete action executes.

### WARNING-11: useAuth race condition
**File**: `src/hooks/useAuth.tsx`
Remove the separate `getSession()` call. Rely solely on `onAuthStateChange` to set state and flip `isLoading`.

### WARNING-12: YouTube token expiry — detect and prompt re-auth
**Files**: `src/components/ExportBar.tsx` (via ImportPlaylistDialog), `src/components/ImportPlaylistDialog.tsx`, `src/components/PlaylistDashboard.tsx`
Add 401 detection after YouTube API calls and show a specific re-auth toast.

### WARNING-13: CORS — restrict wildcard origin
**Files**: `supabase/functions/generate-playlist/index.ts`, `supabase/functions/youtube-import-playlist/index.ts`
Replace hardcoded `'*'` with `Deno.env.get('CORS_ORIGIN') || '*'`.
Add `x-youtube-token` to `Access-Control-Allow-Headers`.

### WARNING-14: Remove playlist_id from ExportToYouTubeRequest body schema
**File**: `backend/app/models/schemas.py`
Remove the `playlist_id` field from `ExportToYouTubeRequest` (path param is always used).

## Files Modified
- `supabase/functions/youtube-import-playlist/index.ts`
- `supabase/functions/generate-playlist/index.ts`
- `backend/app/routers/playlists.py`
- `backend/app/routers/suggestions.py`
- `backend/app/services/playlist_sync.py`
- `backend/app/models/schemas.py`
- `src/components/PlaylistDashboard.tsx`
- `src/components/ImportPlaylistDialog.tsx`
- `src/pages/Auth.tsx`
- `src/hooks/useAuth.tsx`
- `eslint.config.js`

## Notes
- WARNING-9 (rate limit by source): requires a DB migration to add `source varchar default 'ai_generate'` to `generated_playlists` table. Until the migration runs, the `.eq('source', 'ai_generate')` filter returns 0 rows, effectively giving everyone unlimited AI generations. A comment is left in the code noting this.
- WARNING-12 (token refresh): partial fix — added detection and user-friendly re-auth prompt in `ImportPlaylistDialog.tsx` and `PlaylistDashboard.tsx`. Full automatic token refresh requires implementing the Google OAuth refresh token flow, which is out of scope here.
- WARNING-3 (asyncio.gather): the `access_token` is now read from the `X-YouTube-Token` header per CRITICAL-2, so the export route was updated to read from the header as well as part of both fixes.
