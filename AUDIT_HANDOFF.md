# PromptPlay Audit Handoff

Last updated: July 6, 2026

Repository: https://github.com/AliHasan-786/promptplay-ai

Audit branch target: `main`

## Purpose

This document gives an external reviewer enough context to audit the repository without relying on prior chat history.

Review the implementation and product strategy independently. Do not assume that a documented feature is deployed, complete, or correct merely because it appears in a planning document.

## Current Product State

PromptPlay is a React and Supabase application for generating, importing, saving, auditing, repairing, structuring, publishing, and exporting YouTube playlists.

The shipped UI and data model still emphasize guided learning paths. The latest product research questions that positioning and recommends a broader AI decision layer for media consumption:

- audit what deserves attention
- decide whether to watch, skim, summarize, archive, repair, compare, or block
- preserve metadata when videos disappear or become private
- remember why the user made prior media decisions
- use generated workflow UI instead of chat as the primary interaction

This implementation/strategy mismatch is intentional audit material. The next build direction has not been finalized.

## Architecture

| Area | Current implementation |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Authentication | Firebase Google popup, then Google ID token exchange into a Supabase session |
| Optional YouTube authorization | Requested contextually for private imports, export, and account-owned sync |
| Database | Supabase Postgres with RLS migrations |
| Backend | Supabase Edge Functions |
| AI | OpenAI-compatible chat completion endpoint configured through Supabase secrets |
| Media API | YouTube Data API v3 |
| Production frontend | https://promptplay-ai.vercel.app |
| Supabase project ref | `cmxquktpeqosjoacvgvl` |

## Known Deployment State

- Local `main` was synchronized with `origin/main` before this handoff was created.
- The frontend is connected to Vercel through the GitHub repository.
- Source for `audit-playlist` exists in the repository.
- The last recorded attempt to deploy `audit-playlist` failed because the Supabase API reported the project as `INACTIVE`.
- The frontend contains a metadata-based local audit fallback when the cloud audit function is unavailable.
- Do not assume every checked-in Edge Function or migration is deployed. Verify the hosted Supabase state separately.
- Google OAuth verification is an external configuration requirement and may still affect YouTube-sensitive scopes.

## Edge Functions

- `apply-playlist-replacement`
- `audit-playlist`
- `build-learning-path`
- `generate-playlist`
- `save-generated-playlist`
- `suggest-playlist-replacements`
- `sync-playlist`
- `youtube-auth`
- `youtube-create-playlist`
- `youtube-import-playlist`

## Database Migrations

- `supabase/migrations/20251206165739_648c062b-071f-4538-91b8-126e55659d92.sql`
- `supabase/migrations/20260222_schema_overhaul.sql`
- `supabase/migrations/20260603001000_trust_and_learning_paths.sql`
- `supabase/migrations/20260604001000_public_path_pages.sql`
- `supabase/migrations/20260604002000_playlist_progress_and_study_mode.sql`
- `supabase/migrations/20260604003000_library_tags.sql`

## Documentation Inventory

### Entry Points

- `README.md`: setup, architecture, core flows, deployment commands, limits, and document index.
- `AUDIT_HANDOFF.md`: this audit context and review checklist.
- `PRODUCT_STRATEGY.md`: broad product thesis, markets, roadmap, monetization, and production requirements.

### Authentication And Operations

- `GOOGLE_OAUTH_SETUP.md`: original Firebase, Google, YouTube API, and Supabase setup guide.
- `docs/OAUTH_SETUP.md`: updated split-auth flow, OAuth verification, redirect, scope, and deployment guidance.
- `docs/PRODUCTION_ROADMAP.md`: production-readiness and launch roadmap.

### Current Strategic Research

- `docs/YOUTUBE_FEATURE_OVERLAP_RESEARCH_2026.md`: what YouTube already offers or has announced, what not to build, and remaining whitespace as of June 19, 2026.
- `docs/AI_INTERACTION_LAYER_RESEARCH_2026.md`: generative UI, elicitation, intent contracts, decision cards, agent panels, and non-chat interaction concepts.
- `docs/MEDIA_CONSUMPTION_PIVOT_RESEARCH.md`: user pain around attention, Watch Later debt, media cleanup, and intentional consumption.
- `docs/YOUTUBE_CUSTOM_FEED_PIVOT.md`: initial response to YouTube prompt-generated custom feeds.

### Market And Expansion Research

- `docs/COMPETITIVE_RESEARCH.md`: competitor categories, strengths, gaps, and positioning.
- `docs/ECOSYSTEM_RESEARCH.md`: adjacent products, protocols, AI tools, and ecosystem opportunities.
- `docs/EXPANSION_OPPORTUNITIES.md`: additional use cases, technical expansion, and broader product surfaces.
- `docs/FUN_APPLICATIONS.md`: entertainment and playful product applications.

### Planning And Architecture

- `docs/FEATURE_BACKLOG.md`: feature ideas and prioritization candidates.
- `docs/IMPLEMENTATION_EPICS.md`: user stories, phases, and implementation groupings.
- `docs/AI_ARCHITECTURE_OPTIONS.md`: AI orchestration, agent, retrieval, evaluation, and provider options.

### Historical Agent Note

- `.solopreneur/observer-log.md`: historical record of a requested adversarial review. It is not authoritative product documentation.

## Known Risks And Open Questions

- Product positioning is not settled. Shipped learning-path language conflicts with newer decision-layer research.
- YouTube OAuth access tokens are tied to active user sessions; unattended background sync is not implemented.
- Public playlist import avoids YouTube OAuth, while private import/export/sync require additional authorization.
- OAuth verification and consent-screen branding require configuration outside the repository.
- Playlist understanding is primarily based on titles, channels, status, and metadata; transcript-level quality analysis is not broadly implemented.
- No background job queue exists for recurring sync, freshness checks, or notifications.
- Automated coverage is limited. The repository has lint, TypeScript, and production-build gates but no meaningful unit, integration, or end-to-end test suite.
- External API quota, retry, observability, and failure-replay behavior need production scrutiny.
- Edge Functions use service-role access in several workflows; ownership checks and RLS boundaries should receive adversarial review.
- Research sources and descriptions of YouTube features are time-sensitive and should be independently re-verified.

## Suggested Audit Checklist

### Security

- Trace Google ID tokens, Firebase credentials, Supabase sessions, and YouTube access tokens end to end.
- Verify that no privileged token is exposed to the browser or persisted insecurely.
- Review every service-role query for explicit resource ownership checks.
- Review CORS, function authentication, input validation, rate limits, abuse controls, and public-page access.
- Inspect migrations and RLS policies for cross-user data access.

### Correctness And Reliability

- Review import, save, remix, audit, path build, sync, repair, publish, fork/save-copy, and export flows.
- Test deleted/private videos, empty playlists, duplicate videos, expired YouTube tokens, malformed URLs, LLM failures, and API quota failures.
- Verify that frontend fallbacks do not hide backend deployment failures or return misleading scores.
- Check idempotency and partial-failure behavior for playlist writes and exports.

### Product And UX

- Compare the current UI against the latest research docs rather than assuming learning paths remain the final positioning.
- Identify features that YouTube now provides natively and should be removed or de-emphasized.
- Evaluate whether audit, repair, preservation, decision memory, and generated action UI create a credible paid value proposition.
- Review mobile behavior, accessibility, keyboard operation, loading states, error recovery, and first-run OAuth friction.

### Engineering Quality

- Review component size and responsibility, especially `PlaylistDashboard.tsx`.
- Review Edge Function duplication, shared utilities, schema typing, API clients, and error contracts.
- Identify missing tests and propose the smallest production-worthy test pyramid.
- Review bundle size, query count, rendering behavior, logging, analytics, and monitoring gaps.

## Local Verification

```bash
npm install
npm run lint
npm run typecheck
npm run build
```

Supabase deployment requires a healthy linked project and valid CLI authentication:

```bash
npx supabase db push
npx supabase functions deploy audit-playlist --project-ref cmxquktpeqosjoacvgvl
```

Do not place real credentials in audit output, commits, issues, or pull-request comments.

