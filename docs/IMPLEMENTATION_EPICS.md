# Implementation Epics

Last updated: June 4, 2026

## Purpose

This document translates the product strategy into concrete build epics for the current PromptPlay stack.

Use it when deciding:

- what to build next
- what schema changes are required
- what backend jobs or functions are needed
- how to measure whether an epic worked

## Epic 1: Public Path Pages

### Goal

Turn saved playlists and learning paths into public landing pages that can drive acquisition and sharing.

### User stories

- As a curator, I want to publish a path so other people can use it.
- As a visitor, I want to preview the path before signing up.
- As a learner, I want to save or remix a public path into my library.

### Data changes

- add `visibility` on saved playlists and learning paths
- add `slug`
- add `description`, `cover_image_url`, `topic`, `difficulty`, `estimated_time`
- add aggregated counters: `views`, `saves`, `remixes`

### Backend work

- edge function or RPC to publish / unpublish a path
- slug uniqueness checks
- lightweight analytics event ingestion

### Frontend work

- public path route
- preview UI for modules and videos
- save / remix CTA
- canonical metadata for SEO

### Success metric

- percent of public page visitors who save or sign up

## Epic 2: Library Organization

### Goal

Make PromptPlay feel like a durable library instead of a temporary output screen.

### User stories

- As a learner, I want folders and tags so I can organize paths by topic.
- As a returning user, I want fast search and filters so I can find what matters quickly.

### Data changes

- `folders`
- `tags`
- join tables for playlists and tags
- optional sort order fields

### Backend work

- CRUD for folders and tags
- search indexes for titles, notes, summaries, channels

### Frontend work

- library sidebar
- folder filtering
- tag chips
- search bar

### Success metric

- revisit rate for users with at least one tagged or foldered path

## Epic 3: Sync Engine and Repair Layer

### Goal

Make path health a core reason to stay in PromptPlay.

### User stories

- As a user, I want to know when a saved video becomes private or deleted.
- As a curator, I want suggestions for replacements instead of manual repair work.
- As a team owner, I want confidence that assigned paths stay usable.

### Data changes

- `sync_runs`
- `playlist_item_snapshots`
- `replacement_candidates`
- `health_status`, `last_synced_at`, `freshness_score`

### Backend work

- scheduled sync job
- idempotent sync runner
- repair suggestion generator
- notification triggers

### Frontend work

- health badges
- change timeline
- replacement review UI
- "apply replacement" action

### Success metric

- percent of unhealthy playlists repaired within 7 days

## Epic 4: Notes and Summaries

### Goal

Create compounding user value so PromptPlay becomes harder to leave.

### User stories

- As a learner, I want timestamped notes while watching or reviewing.
- As a user, I want summaries at video, module, and path levels.
- As a researcher, I want to search what I learned across many paths.

### Data changes

- `notes`
- `video_summaries`
- `module_summaries`
- `path_summaries`
- embeddings fields or a separate vector table later

### Backend work

- summary generation job
- transcript capture / chunking
- note search endpoints

### Frontend work

- notes editor
- timestamp links
- summary panels
- global search results page

### Success metric

- share of saved paths with at least one note or summary interaction

## Epic 5: Review and Outcomes

### Goal

Move the product from content management into real learning outcomes.

### User stories

- As a learner, I want flashcards and quizzes to remember what I watched.
- As a user, I want a review queue so I do not forget the material.
- As a curator, I want a path to feel more like a course than a list.

### Data changes

- `flashcards`
- `quiz_items`
- `review_events`
- `module_progress`
- `path_progress`

### Backend work

- flashcard / quiz generation
- scoring and review scheduling logic
- progress aggregation

### Frontend work

- flashcard player
- short quiz UI
- progress dashboard
- review queue page

### Success metric

- percentage of users who return to complete a review action

## Epic 6: Chrome Extension MVP

### Goal

Capture intent where it happens: on YouTube.

### User stories

- As a viewer, I want to save a video or playlist without leaving YouTube.
- As a learner, I want to see my progress and notes while watching.
- As a returning user, I want to continue where I left off.

### Data changes

- no major new domain entities required beyond notes and progress
- add `source_context` metadata for save origin

### Backend work

- extension auth flow
- save/import endpoints optimized for extension usage
- rate-limited note sync endpoint

### Frontend work

- browser extension popup
- in-page save button
- progress overlay
- lightweight notes sidebar

### Success metric

- extension install to first save conversion

## Epic 7: Workspaces and Assignments

### Goal

Create a credible B2B offer for onboarding, enablement, and cohort use.

### User stories

- As a manager, I want to assign a path to teammates.
- As a coach, I want to see learner progress.
- As a company, I want private paths and basic role controls.

### Data changes

- `organizations`
- `organization_memberships`
- `assignments`
- `assignment_progress`
- `audit_events`

### Backend work

- invites and role management
- assignment creation
- progress rollups by team

### Frontend work

- workspace switcher
- team dashboard
- assignment table
- member management

### Success metric

- number of teams with more than one assigned path in active use

## Epic 8: Billing and Entitlements

### Goal

Convert product value into durable revenue without relying on manual sales.

### User stories

- As a user, I want clear plan limits and upgrade prompts.
- As a team owner, I want predictable seat billing.
- As the business, I want server-side entitlement checks.

### Data changes

- `subscriptions`
- `entitlements`
- `usage_events`
- `billing_customers`

### Backend work

- Stripe checkout
- webhook processing
- entitlement middleware

### Frontend work

- billing page
- upgrade gates
- plan comparison UI

### Success metric

- free to paid conversion and paid retention

## Recommended build order

1. Public path pages
2. Library organization
3. Sync engine and repair layer
4. Notes and summaries
5. Review and outcomes
6. Chrome extension MVP
7. Workspaces and assignments
8. Billing and entitlements

## What not to do during these epics

- do not expand into general document summarization yet
- do not build native mobile before the extension proves demand
- do not overinvest in social feed mechanics
- do not build team admin complexity before at least a few real team users exist
