# PromptPlay AI — Engineer Memory

## Stack
- Frontend: React + TypeScript + Vite, shadcn/ui, Tailwind
- Auth: Firebase (Google OAuth popup) + Supabase (JWT sync via signInWithIdToken)
- Backend: FastAPI (Python), Supabase client (supabase-py)
- Edge Functions: Supabase (Deno/TypeScript)
- DB: Supabase (Postgres); key tables: generated_playlists, playlist_items, videos

## Key Schema Facts
- Videos shared across playlists via: videos (youtube_video_id PK) + playlist_items (playlist_id, youtube_video_id, position, status)
- NO playlist_songs table — that was a legacy table that has been removed
- generated_playlists.source field: 'ai_generate' | 'import' — REQUIRES DB MIGRATION (column may not exist yet)

## Auth Pattern
- YouTube OAuth token passed as X-YouTube-Token header (not in request body)
- Supabase JWT passed as Authorization: Bearer <token> header
- useAuth.tsx: rely solely on onAuthStateChange; no separate getSession() call

## Security Conventions
- Edge function outer catch: never return raw error.message; log server-side, return generic message
- Known/expected errors (bad URL, missing field) use specific user-friendly messages with appropriate status codes
- Rate limit response: HTTP 429

## CORS
- Use Deno.env.get('CORS_ORIGIN') || '*' in edge functions (not hardcoded '*')
- x-youtube-token must be in Access-Control-Allow-Headers

## Performance Patterns
- Always batch DB queries with .in_() — never query per-item in a loop
- Parallel YouTube API calls: asyncio.gather() in Python, Promise.all() in TS

## Detail files
- See patterns.md for more architectural notes
