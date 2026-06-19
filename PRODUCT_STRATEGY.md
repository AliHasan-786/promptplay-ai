# PromptPlay Product Strategy

Last updated: June 18, 2026

Companion docs:

- [YouTube custom feed pivot](./docs/YOUTUBE_CUSTOM_FEED_PIVOT.md)
- [Competitive research](./docs/COMPETITIVE_RESEARCH.md)
- [Ecosystem research](./docs/ECOSYSTEM_RESEARCH.md)
- [Expansion opportunities](./docs/EXPANSION_OPPORTUNITIES.md)
- [Feature backlog](./docs/FEATURE_BACKLOG.md)
- [Fun applications](./docs/FUN_APPLICATIONS.md)
- [AI architecture options](./docs/AI_ARCHITECTURE_OPTIONS.md)
- [Implementation epics](./docs/IMPLEMENTATION_EPICS.md)
- [Production roadmap](./docs/PRODUCTION_ROADMAP.md)

## 1. Executive Summary

PromptPlay should not compete as a generic “AI playlist generator.”

That category is already crowded by:

- native YouTube / Google product surfaces
- lightweight Chrome extensions for playlist progress
- note-taking and summarization apps
- new AI-first products that already turn YouTube into learning paths

The strongest direction is:

`PromptPlay = the operating system for curated YouTube learning and research collections`

The product should help users:

1. discover or import good content
2. structure it into a useful sequence
3. keep it healthy over time as YouTube changes
4. turn passive watching into outcomes: learning, onboarding, research, or creator intelligence

## 2. Market Reality

### Native Competition

- YouTube Music already offers generative “Ask Music” mixes.
- Gemini can create YouTube Music playlists or radio.
- YouTube has rolled out prompt-generated custom feeds where users type interests and get a personalized feed directly inside YouTube.
- YouTube has creator-side Courses, but they are limited and do not allow cross-channel video inclusion.
- YouTube’s one-time paid Course model was wound down in late 2025.

Implication:

- Google is covering generic playlist and feed generation.
- Google is not solving cross-channel structured learning, maintenance, team workflows, or durable knowledge capture well.
- PromptPlay should treat YouTube discovery as an input source, not the thing to beat.

### Third-Party Competition Buckets

#### A. Progress-tracking overlays

- TrackMyCourse
- Reet
- YouTube Playlist Guru

What they do well:

- progress bars
- duration tracking
- “resume where you left off”
- browser-native workflow

Where they are weak:

- little or no durable library model
- weak or nonexistent AI structure
- minimal collaboration or monetizable workflows

#### B. Notes / summarization apps

- Wisdom Eye
- TubeOnAI
- MemoLib
- Walnote
- Knotic

What they do well:

- summaries
- timestamped notes
- knowledge extraction
- multi-format content understanding

Where they are weak:

- weak playlist maintenance
- usually centered on single-video understanding, not collection design
- weak export back to YouTube
- often weak sequence logic

#### C. Learning-path products

- LearnPath
- SabLearning
- LearnWeaver
- LearningPath.us
- Learnerpath

What they do well:

- structure
- quizzes
- progress tracking
- learning-path framing

Where they are weak or exposed:

- many are new, free, or narrow
- most focus on solo learners only
- few have a strong playlist-health / sync / ghost-video maintenance layer
- few look like serious infrastructure for pros, teams, creators, or curated libraries

## 3. The Wedge

PromptPlay should focus on one primary wedge first:

`Cross-channel YouTube learning paths that stay useful over time`

This wedge is stronger than generic playlist generation because it combines:

- curation
- sequencing
- quality audits
- maintenance
- knowledge extraction
- reuse

The core promise:

`YouTube gives you a feed. PromptPlay turns it into a durable, structured, explorable learning asset.`

## 4. Who It Is For

### Primary ICP: ambitious self-learners

Examples:

- developers learning frameworks, AI, data, cloud, interviews
- designers learning Figma, Framer, motion, UX
- operators learning analytics, GTM, sales, revops

Why this segment:

- they already use YouTube heavily
- they feel the pain of fragmented tutorials
- they pay for tools when the ROI is obvious
- they share good resources with peers

### Secondary ICP: creators, coaches, and curators

Examples:

- creators publishing “best resources to learn X”
- coaches sending playlists to mentees
- educators building free public paths
- agencies sharing onboarding or enablement paths internally

### Tertiary ICP: teams and communities

Examples:

- startup onboarding
- customer education
- sales enablement
- cohort-based learning communities
- niche Discord / Slack groups

## 5. Jobs To Be Done

### Solo learning jobs

- “Help me stop drowning in random YouTube tutorials.”
- “Turn these 20 videos into the order I should actually watch.”
- “Show me what I already learned and what is still missing.”
- “When videos disappear, help me keep the path intact.”

### Knowledge jobs

- “Pull out the useful ideas from this playlist.”
- “Let me search across everything I watched.”
- “Turn this collection into notes, flashcards, quizzes, and review prompts.”

### Team / curation jobs

- “Package the best YouTube resources into a shareable path.”
- “Give this to new hires / mentees / students and see progress.”
- “Keep the path fresh as links break or better videos appear.”

## 6. Product Thesis

PromptPlay wins if it combines four layers that most competitors split apart:

1. `Collection layer`
   Import, save, remix, organize, tag, search.

2. `Structure layer`
   Modules, prerequisites, sequencing, estimated time, difficulty, path rationale.

3. `Maintenance layer`
   Sync, ghost detection, replacement suggestions, freshness checks, version history.

4. `Outcome layer`
   Notes, recall, quizzes, assignments, exports, collaboration, progress.

Most competitors are strong in only one or two layers.

## 7. Feature Stack

### 7.1 Foundation Features

- Prompt-to-playlist generation
- Import YouTube playlists
- Path-quality audits
- Export to YouTube
- Save generated collections
- Remix saved collections
- Sync linked playlists
- Detect deleted/private videos
- Replace unavailable videos
- Search/filter/sort your library
- Tags, folders, categories

### 7.2 Learning Path Features

- Convert any playlist into modules
- Suggested watch order
- Learning objectives per path
- Per-module goal and outcome
- Difficulty level
- Time estimate
- “Why this video is here”
- Missing prerequisite detection
- Redundancy detection
- “Skip this if you already know X”

### 7.3 Knowledge Features

- Timestamped notes
- Chapter extraction
- Summary per video
- Summary per module
- Summary per full path
- Flashcards
- Quiz generation
- Reflection prompts
- Search across notes and paths
- “Find the video where I learned this”

### 7.4 Maintenance Features

- Scheduled sync
- Ghost-video detection
- Replacement recommendations
- Freshness score
- Duplicate detection
- Version history for paths
- “This path changed since last week”
- Channel drift alerts

### 7.5 Social / Distribution Features

- Public share pages
- Remix someone else’s path
- Fork a public path
- Ratings / save counts
- creator profile pages
- “top paths for X”
- embeddable path pages

### 7.6 Team / B2B Features

- shared workspaces
- onboarding paths
- assigned paths
- completion tracking
- internal notes / comments
- viewer roles / editor roles
- private paths
- branded share pages
- analytics by learner/team

### 7.7 Extension / Workflow Features

- Chrome extension
- one-click import from YouTube
- in-page “save to PromptPlay”
- progress overlay on YouTube
- distraction-free focus mode
- quick notes sidebar

### 7.8 Power Features

- transcript-backed path generation
- semantic recommendations from embeddings
- compare two paths
- AI coach for “what to watch next”
- path gap analysis
- topic map / skill graph
- certification / completion artifact

## 8. The Features That Most Likely Create a Moat

### Strong moat candidates

#### A. Playlist health and maintenance

This is not sexy, but it is durable.

If PromptPlay becomes the system that preserves and repairs valuable YouTube learning collections over time, users have switching costs. Most tools generate or summarize once and stop there.

#### B. Cross-channel structured paths

YouTube Courses are creator-side and constrained. PromptPlay can compose across channels, playlists, and resource types.

#### C. Curation + maintenance + knowledge in one stack

Notes alone are weak.
Progress alone is weak.
Summaries alone are weak.

The combined stack is much harder to replace.

#### D. Shareable public paths with fork/remix behavior

This creates SEO and community distribution while generating a data flywheel of high-quality curated paths.

#### E. Team / onboarding workflows

This creates higher willingness to pay than consumer playlist tooling.

## 9. Features To Avoid Early

- building a giant all-content summarizer across every media type
- generic “chat with anything” before core retention is good
- overbuilding social feeds
- trying to be Coursera/Udemy
- heavy certification features too early
- mobile-native first before web + extension workflows are sharp

These are easy ways to lose focus.

## 10. Recommended Product Tiers

### Tier 1: Curated playlist manager

Who:

- current app users
- YouTube-heavy learners

Core value:

- import
- remix
- export
- sync
- basic path generation

### Tier 2: Learning OS

Who:

- serious self-learners
- interview prep
- skill-building users

Core value:

- learning paths
- progress
- notes
- flashcards
- quizzes
- spaced review
- weekly sync

### Tier 3: Team knowledge / enablement

Who:

- startups
- agencies
- creator communities
- coaches

Core value:

- shared paths
- assignments
- branded pages
- private libraries
- analytics

## 11. Roadmap

### Phase 1: Stabilize and clarify the wedge

Goal:

- make PromptPlay trustworthy
- make the new positioning obvious

Ship:

- server-owned save/export/sync flows
- learning path generation
- path audit against sequencing, gaps, and maintenance risk
- source-aware playlists
- playlist health states
- better landing and dashboard messaging

Success metric:

- % of generated/imported playlists that are saved

### Phase 2: Retention loop

Goal:

- get users to come back

Ship:

- scheduled sync
- unavailable-video alerts
- replacement suggestions
- saved notes
- public share pages

Success metric:

- 7-day return rate
- % of saved playlists revisited

### Phase 3: Learning outcomes

Goal:

- convert passive libraries into outcomes

Ship:

- quizzes
- flashcards
- module completion
- streaks
- review queue

Success metric:

- path completion rate
- review repeat rate

### Phase 4: Distribution and growth

Goal:

- get low-cost acquisition

Ship:

- Chrome extension
- public path SEO pages
- fork/remix/share loop
- creator path pages

Success metric:

- % of new users from shared/public pages

### Phase 5: Monetization expansion

Goal:

- move from hobby SaaS to real revenue

Ship:

- Pro plan
- Team workspace
- branded/private paths
- analytics

Success metric:

- free-to-paid conversion
- logo retention

## 12. Production-Level Product Requirements

### Data model

You now need durable models for:

- users
- playlists
- playlist items
- learning paths
- path modules
- notes
- quiz items
- flashcards
- sync runs
- replacement suggestions
- tags / folders
- organizations / teams

### Backend / async work

You should plan for:

- job queue for imports, syncs, and path generation
- retriable external API calls
- transcript / caption ingestion pipeline
- embeddings pipeline
- scheduled syncs
- email / notification jobs

### Auth / account model

- cleaner Google/YouTube connection model
- durable token handling if background jobs are required
- organization roles
- invite flow

### Reliability

- observability
- function-level error tracking
- background job monitoring
- replay for failed imports/syncs
- rate-limit handling for YouTube and LLM vendors

### Abuse / safety

- prompt abuse controls
- public-path moderation
- storage / generation quotas
- anti-spam for shared pages

### Billing

- Stripe subscriptions
- plan limits
- usage metering
- seat billing for teams

### Analytics

- acquisition source
- prompt -> save rate
- import -> path build rate
- save -> export rate
- save -> return rate
- path completion rate
- sync usage
- ghost-video detection frequency

## 13. Best Near-Term Use Cases

### 1. Coding interview prep

Why it works:

- high urgency
- repeat usage
- obvious outcomes
- high shareability

### 2. AI / developer upskilling

Why it works:

- heavy YouTube usage
- fragmented content problem is severe
- users pay for speed and structure

### 3. Creator research libraries

Why it works:

- persistent value
- knowledge extraction matters
- playlists change over time

### 4. Team onboarding

Why it works:

- clear willingness to pay
- private/branded paths matter
- progress visibility matters

### 5. Certification / exam playlists

Why it works:

- path + quiz + spaced review fits naturally

## 14. Pricing

### Recommended initial pricing

#### Free

- limited saved playlists
- limited imports
- one learning path at a time
- no scheduled sync

#### Pro: $10-$15/month

- unlimited saved playlists
- unlimited imports
- advanced learning paths
- sync and ghost alerts
- notes / flashcards / quizzes
- public path pages

#### Team: $39-$149/month depending on seats

- workspace
- shared paths
- assignments
- progress analytics
- private/branded pages

### Pricing principle

Do not charge for “AI prompting.”

Charge for:

- durable organization
- maintenance
- learning outcomes
- collaboration
- time saved

## 15. GTM

### Acquisition channels

- SEO around “best YouTube learning path for X”
- public path pages
- Chrome extension install funnel
- Reddit / X / developer communities
- creator partnerships
- “import your playlist and score it” free tool

### Growth loops

- shared public paths
- fork/remix a path
- export to YouTube with PromptPlay attribution
- extension to web app handoff

### Initial messaging

Bad:

- “AI YouTube playlist generator”

Better:

- “Turn any YouTube playlist into a guided learning path”
- “YouTube gives you the feed. PromptPlay turns it into an outcome.”
- “Stop losing great YouTube tutorials”
- “Import, organize, sync, and finish the playlists you actually care about”

## 16. Key Metrics

### North star

- weekly active learners with at least one saved or imported playlist revisited

### Core funnel

- prompt/import -> save
- save -> path build
- path build -> revisit
- revisit -> completion action
- free -> paid

### Health metrics

- time to first value
- ghost-video detection rate
- sync success rate
- percentage of playlists with notes or paths
- path completion rate

## 17. Recommended Next 90 Days

### Days 1-30

- polish the current dashboard and product copy
- add public path pages
- add replacement suggestions for ghost videos
- add path metadata editing
- add playlist tags / folders

### Days 31-60

- ship timestamped notes
- ship basic transcript-backed summaries
- ship flashcards or short quizzes
- ship Chrome extension MVP

### Days 61-90

- ship scheduled sync
- ship notifications
- ship public/fork/remix flow
- ship Pro paywall

## 18. What “Production-Level” Means Here

For PromptPlay, production-level is not just better code.

It means:

- the app solves a real repeated problem
- users can trust their library won’t break
- the product has a retention loop
- the value compounds over time
- the business can charge for something users would hate to lose

That standard is achievable if PromptPlay becomes the durable system for structured YouTube learning and curation, not just another AI wrapper around search.
