# PromptPlay

PromptPlay turns YouTube feeds and playlists into durable learning paths:

- generate or import a starter collection
- import an existing YouTube playlist
- audit whether a collection is complete, sequenced, and durable
- remix a saved playlist into new recommendations
- export playlists back to YouTube
- structure tutorial or research playlists into guided learning paths
- sync imported/exported playlists to detect deleted or private videos

This is no longer a flat “AI playlist maker.” YouTube is increasingly strong at prompt-based discovery, so PromptPlay’s product direction is `feed-to-path infrastructure`: import, audit, organize, maintain, and reuse video collections over time.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind, shadcn/ui |
| Auth | Firebase Google popup + Supabase session sync |
| Backend | Supabase Postgres + Edge Functions |
| AI | OpenAI-compatible chat completion endpoint |
| External APIs | YouTube Data API v3 |

## Core Flows

1. `generate-playlist`
   Expands a prompt into curated YouTube search queries and returns unique videos.
2. `save-generated-playlist`
   Persists generated or remixed playlists server-side, including video metadata and playlist items.
3. `youtube-import-playlist`
   Imports an existing YouTube playlist into PromptPlay and preserves unavailable videos.
4. `build-learning-path`
   Turns a flat playlist into ordered modules with goals, outcomes, and watch-order rationale.
5. `audit-playlist`
   Scores a saved collection against path quality, missing angles, sequence risk, maintenance risk, and next actions.
6. `sync-playlist`
   Refreshes playlist availability against YouTube so deleted/private items are visible.
7. `youtube-create-playlist`
   Exports a saved PromptPlay playlist back to YouTube and records the linked YouTube playlist id.

## Local Setup

### Prerequisites

- Node.js 18+
- A Supabase project
- A Firebase project with Google Auth enabled
- A YouTube Data API key
- An OpenAI-compatible LLM API key

### Frontend Environment

Create `.env.local` from `.env.example` and fill in the `VITE_*` variables:

```bash
cp .env.example .env.local
npm install
npm run dev
```

### Supabase Secrets

Set these in Supabase Edge Function secrets:

| Secret | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Required for server-owned playlist persistence |
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `LLMAPI_KEY` | LLM provider key |
| `LLMAPI_BASE_URL` | Optional OpenAI-compatible endpoint override |
| `LLMAPI_MODEL` | Optional model override, defaults to `gpt-4o-mini` |
| `CORS_ORIGIN` | Optional allowed origin for edge functions |

### Deploy Edge Functions

```bash
npx supabase functions deploy generate-playlist
npx supabase functions deploy save-generated-playlist
npx supabase functions deploy build-learning-path
npx supabase functions deploy audit-playlist
npx supabase functions deploy sync-playlist
npx supabase functions deploy youtube-import-playlist
npx supabase functions deploy youtube-create-playlist
```

### Database

Run the checked-in migrations, including the latest trust + learning-path migration:

```bash
npx supabase db push
```

## Firebase / Google Auth

PromptPlay signs users in with Firebase on the client, then exchanges the Google ID token into a Supabase session with `signInWithIdToken`.

Use [OAuth setup](./docs/OAUTH_SETUP.md) for the exact Firebase, Supabase, and Google OAuth setup.

## Quality Gates

```bash
npm run lint
npm run typecheck
npm run check
```

## Product Direction

The strongest wedge for PromptPlay is not generic music prompts. It is:

`import any YouTube playlist or topic and turn it into a durable, structured learning or research path`

That wedge matters because PromptPlay can:

- sequence videos across multiple creators
- preserve deleted/private items as part of the record
- remix existing collections into adjacent recommendations
- keep the library useful after YouTube changes underneath it

## Planning Docs

- [Product strategy](./PRODUCT_STRATEGY.md)
- [Competitive research](./docs/COMPETITIVE_RESEARCH.md)
- [Ecosystem research](./docs/ECOSYSTEM_RESEARCH.md)
- [Expansion opportunities](./docs/EXPANSION_OPPORTUNITIES.md)
- [Feature backlog](./docs/FEATURE_BACKLOG.md)
- [Fun applications](./docs/FUN_APPLICATIONS.md)
- [AI architecture options](./docs/AI_ARCHITECTURE_OPTIONS.md)
- [Implementation epics](./docs/IMPLEMENTATION_EPICS.md)
- [OAuth setup](./docs/OAUTH_SETUP.md)
- [Production roadmap](./docs/PRODUCTION_ROADMAP.md)
- [YouTube custom feed pivot](./docs/YOUTUBE_CUSTOM_FEED_PIVOT.md)

## Current Limits

- YouTube access currently depends on the user’s active sign-in session in the app.
- The app does not yet run unattended background refresh jobs.
- Playlist quality still depends on titles/channels rather than transcript-level understanding.

## License

MIT
