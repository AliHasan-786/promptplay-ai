# Promptplay — AI YouTube Playlist Generator

Describe any content — music, tutorials, reviews, podcasts — and Promptplay finds the best YouTube videos, assembles them into a playlist, and exports directly to your YouTube account.

**[Live Demo →]([(https://promptplay-ai.vercel.app/)]

---

## Features

- **AI-Powered Search** — Describe what you want in natural language and get curated YouTube results
- **Export to YouTube** — One click creates a real playlist on your YouTube account
- **Import Playlists** — Import existing YouTube playlists for backup and management
- **Smart Deduplication** — No duplicate videos across generated results
- **Auto-Refreshing Auth** — YouTube connection stays alive across sessions

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | Supabase (Auth, PostgreSQL, Edge Functions) |
| **AI** | LLM API (GPT-4o-mini) for search query generation |
| **APIs** | YouTube Data API v3 (search, playlists, import) |
| **Deployment** | Vercel (frontend), Supabase Cloud (backend) |

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌──────────────┐
│   React App     │────▶│  Supabase Edge Fns   │────▶│  YouTube API │
│  (Vite + TS)    │     │  • generate-playlist  │     │  • Search    │
│                 │     │  • youtube-auth       │     │  • Playlists │
│  Components:    │     │  • youtube-create     │     │  • Import    │
│  • ChatInterface│     │  • youtube-import     │     └──────────────┘
│  • Dashboard    │     └──────────┬───────────┘
│  • ExportBar    │                │              ┌──────────────┐
└─────────────────┘                └─────────────▶│  LLM API     │
                                                  │  (GPT-4o-mini)│
                                                  └──────────────┘
```

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account with project
- YouTube Data API key
- Google OAuth 2.0 credentials
- LLM API key

### Setup

```bash
# Clone and install
git clone https://github.com/AliHasan-786/promptplay-ai.git
cd promptplay-ai
npm install

# Run locally
npm run dev
```

### Environment Variables

Set these as **Supabase Secrets** (not `.env`):

| Secret | Description |
|--------|-------------|
| `YOUTUBE_API_KEY` | YouTube Data API v3 key |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Web Client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret |
| `LLMAPI_KEY` | LLM provider API key |
| `LLMAPI_BASE_URL` | LLM API endpoint (optional) |
| `LLMAPI_MODEL` | LLM model name (default: gpt-4o-mini) |

### Deploy Edge Functions

```bash
npx supabase functions deploy generate-playlist --no-verify-jwt
npx supabase functions deploy youtube-auth --no-verify-jwt
npx supabase functions deploy youtube-create-playlist --no-verify-jwt
npx supabase functions deploy youtube-import-playlist --no-verify-jwt
```

### Deploy Frontend

```bash
npm run build
npx vercel --prod
```

## Safety & Rate Limiting

- **Rate limited** to 15 playlist generations per user per day
- **Content filter** refuses prompts requesting violent, sexual, or hateful content
- **Off-topic detection** guides users back to video search for non-video queries
- YouTube's own Trust & Safety filters all surfaced content

## License

MIT
