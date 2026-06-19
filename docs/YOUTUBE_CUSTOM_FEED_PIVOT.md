# YouTube Custom Feed Pivot

Last updated: June 18, 2026

## What changed

YouTube has rolled out prompt-generated custom feeds. A user can describe a topic, mood, or interest and YouTube will create a personalized feed that can be pinned and edited.

This removes a lot of value from a generic "type a prompt, get videos" product. PromptPlay should assume YouTube will keep getting better at discovery inside YouTube.

## Strategic implication

PromptPlay should not compete with YouTube on:

- basic discovery
- endless recommendation feeds
- casual entertainment personalization
- generic prompt-to-video lists

PromptPlay should compete on what YouTube feeds are structurally weak at:

- turning a pile of videos into a coherent learning path
- auditing whether a playlist is complete, sequenced, and actionable
- preserving playlists when videos disappear, go private, or become stale
- adding notes, checkpoints, practice tasks, and progress
- letting curators, teams, and communities reuse and publish durable paths

## New positioning

Avoid:

- AI YouTube playlist generator
- Find the best YouTube videos
- Custom feed alternative

Use:

- Turn any YouTube feed or playlist into a durable learning path
- Import, audit, repair, and finish the playlists that matter
- YouTube gives you the feed. PromptPlay turns it into an outcome.
- Build cross-channel curricula YouTube cannot package for you

## Product wedge

The new wedge is:

`Feed-to-path infrastructure`

The core product promise:

`PromptPlay turns YouTube discovery into structured, maintainable learning and research assets.`

## Feature priorities after the pivot

### 1. Path audit

Users need immediate proof that PromptPlay is not just another recommendation surface.

Audit should answer:

- Is this playlist actually a good path?
- What is missing?
- Is the order usable?
- What will decay over time?
- What should I do next?

### 2. Public import without OAuth

Public and unlisted playlist import should not require a second Google flow. YouTube OAuth should only be needed for private playlist import, export, and account-owned sync.

### 3. Build path from imported feeds

The strongest loop is:

1. Use YouTube's custom feed to discover.
2. Save or assemble a playlist.
3. Import it into PromptPlay.
4. Audit quality and gaps.
5. Build a guided path.
6. Track progress, notes, repairs, and sharing.

### 4. Repair and freshness

YouTube feeds are ephemeral. PromptPlay should make saved paths durable with:

- sync status
- unavailable video detection
- replacement suggestions
- freshness scores
- scheduled review

### 5. Curator and team workflows

Paid value is stronger when paths are reused by others:

- onboarding paths
- cohort study paths
- creator resource pages
- team enablement libraries
- community-curated collections

## What shipped in response

- Home screen copy now focuses on turning YouTube into a path, not finding videos.
- Public playlist import no longer requires YouTube OAuth.
- Auth now supports a one-pass full-access path for users who need private import/export/sync.
- Saved playlists now have an Audit action that evaluates path quality, missing angles, sequencing risk, maintenance risk, and next actions.

## References

- YouTube announcement: <https://support.google.com/youtube/thread/436892232/introducing-a-new-discovery-experience-designed-by-you>
- The Verge coverage: <https://www.theverge.com/streaming/938759/youtube-custom-ai-feed-prompt-availability>
- 9to5Google coverage: <https://9to5google.com/2026/05/27/youtube-adds-custom-feed-to-home-page/>
