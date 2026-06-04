# Production Roadmap

Last updated: June 4, 2026

## Objective

Turn PromptPlay from a promising React + Supabase app into a production-grade product with:

- a clear wedge
- strong repeat value
- a believable moat
- a path to paid conversion

## Current stack reality

PromptPlay today is built on:

- React 18 + TypeScript + Vite
- Tailwind + shadcn/ui
- Supabase Postgres + Edge Functions
- Firebase Google auth bridged into Supabase
- YouTube Data API
- OpenAI-compatible LLM endpoint

This stack is enough for the next stage, but production readiness requires additional systems around it.

## Architecture additions required

### 1. Background jobs

Needed for:

- scheduled sync
- transcript ingestion
- path rebuilds
- replacement suggestion generation
- notification delivery

Implementation direction:

- add a `jobs` table and job runner pattern first
- use Supabase cron / scheduled invocations for low-volume jobs
- move to a dedicated worker queue only when job volume or latency requires it

### 2. Durable connection model

Needed for:

- background YouTube sync
- reliable exports
- fewer auth edge cases

Implementation direction:

- separate auth identity from provider connection records
- track provider scopes, connection status, refresh metadata, and last successful sync
- make "connected to YouTube" a first-class account state

### 3. Expanded domain model

Add durable entities for:

- playlists
- playlist items
- learning paths
- modules
- module items
- notes
- summaries
- flashcards
- quizzes
- sync runs
- replacement candidates
- folders / tags
- organizations
- memberships
- assignments
- notifications
- billing entitlements

### 4. Observability

Needed for:

- debugging YouTube import failures
- understanding LLM quality issues
- protecting the paid product

Implementation direction:

- structured logs for every edge function
- failure event table for async jobs
- error monitoring
- analytics events for core user actions

### 5. Billing foundation

Needed for:

- paid conversion
- usage-based controls
- team plans

Implementation direction:

- Stripe subscriptions
- subscription status mirrored in Postgres
- entitlement checks server-side
- usage meters for imports, syncs, transcripts, and AI-heavy features

## Product roadmap

### Phase 1: production baseline

Target: next 30 days

Ship:

- public path pages
- folders and tags
- path metadata editing
- ghost-video replacement suggestions
- source filters and library search polish

Ops:

- event tracking for prompt/import/save/export/path-build
- structured error logging in every edge function
- admin dashboard or SQL views for failures

Success metrics:

- prompt/import to save rate
- save to revisit rate
- sync success rate

### Phase 2: retention engine

Target: days 31-60

Ship:

- timestamped notes
- per-video and per-module summaries
- weekly digest or update alerts
- freshness score
- initial review queue

Ops:

- first background job runner
- notification pipeline
- first transcript processing path

Success metrics:

- weekly active users with at least one revisit
- note attach rate
- percentage of saved paths with follow-up activity

### Phase 3: learning outcomes

Target: days 61-90

Ship:

- flashcards
- short quizzes
- module completion tracking
- study plans / weekly time budgeting
- path progress dashboard

Ops:

- AI cost instrumentation
- quality feedback collection on generated learning assets

Success metrics:

- path completion rate
- review repeat rate
- free to paid conversion on learner plan

### Phase 4: workflow capture and growth

Target: months 4-6

Ship:

- Chrome extension MVP
- save to PromptPlay from YouTube
- overlay with progress and notes
- fork/remix lineage
- creator / curator public pages

Ops:

- attribution tracking from extension and public pages
- SEO publishing templates for public paths

Success metrics:

- share-driven signups
- extension install to app signup rate
- public path save rate

### Phase 5: team revenue

Target: months 6-12

Ship:

- workspaces
- assignments
- learner analytics
- private/branded path pages
- invite roles and seat billing

Ops:

- audit logs
- permissions review
- basic admin tooling for team support

Success metrics:

- number of active workspaces
- seat expansion
- team retention

## Detailed production checklist

### Reliability

- idempotent imports and syncs
- retry policy for YouTube and LLM failures
- dead-letter handling for failed jobs
- migration discipline and rollback notes

### Security

- RLS coverage audited for every new table
- service-role use isolated to server-owned flows
- connection secrets and tokens never exposed to the client
- rate limits on expensive generation endpoints

### Data quality

- preserve unavailable videos rather than dropping them
- track source provenance on every path item
- keep raw ingest metadata separate from user-edited metadata
- store sync history for debugging and trust

### Analytics

- acquisition source
- prompt quality metrics
- import quality metrics
- save / revisit / completion funnel
- paid conversion and activation metrics

### Support and operations

- admin tooling for replaying failed jobs
- user-visible status for imports and syncs
- support-friendly error identifiers
- billing event reconciliation

## Team and role plan

### Suggested first roles

- owner
- editor
- viewer

### Team workflows worth supporting

- assign a path to new hires
- assign a path to a cohort
- require module completion
- track progress by user and team
- comment on a path internally

## Pricing model

### Free

- limited saved paths
- limited imports
- one active generated learning path
- no scheduled sync
- no advanced review features

### Pro

Recommended price: `$12/month` or `$120/year`

Includes:

- unlimited saved paths
- scheduled sync
- alerts
- notes
- summaries
- flashcards
- quizzes
- public publishing

### Team

Recommended starting price: `$49/month` base plus seat expansion

Includes:

- workspaces
- assignments
- analytics
- private/branded pages
- role controls

## Go-to-market plan

### Primary acquisition wedges

- public path SEO pages
- Chrome extension
- playlist health score free tool
- niche creator partnerships
- communities around AI, coding, design, and analytics

### Best content motions

- best YouTube paths for topic X
- import and repair broken playlists
- creator-curated "starter kits"
- interview prep and certification guides

### First niches to dominate

1. AI engineering and applied LLM learning
2. software engineering interview prep
3. Figma / design systems / UI design
4. analytics and growth operations

## What would count as real product-market progress

You should not call the product "working" because it builds playlists.

It is working when:

- users save paths they revisit
- they lose work when they churn
- public paths bring in new users
- scheduled sync prevents real breakage
- at least one segment is willing to pay without hand-holding

## Recommended next implementation docs

After this roadmap, the next useful internal documents are:

- `Implementation epics`
- `PRD: Durable Learning Paths`
- `Schema plan: notes, summaries, assignments, organizations`
- `Extension spec: save, progress overlay, notes sidebar`
- `Billing spec: entitlements, quotas, Stripe events`
