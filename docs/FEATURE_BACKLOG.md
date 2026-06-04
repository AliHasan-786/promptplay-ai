# Feature Backlog

Last updated: June 4, 2026

## Product principle

Do not add features because they are possible.

Add features that increase at least one of these:

- trust in the saved library
- repeat usage
- completion and outcomes
- public distribution
- team willingness to pay

## Primary use-case clusters

### 1. Self-learner upskilling

Examples:

- software engineering
- AI / ML
- design
- analytics
- interview prep

Jobs:

- find the right sequence
- stop losing good playlists
- finish what I saved
- review what I learned

### 2. Creator and curator libraries

Examples:

- "best videos to learn X"
- research boards
- niche resource guides
- community-curated topic collections

Jobs:

- package the best material well
- share it publicly
- keep it current
- let others remix it

### 3. Team onboarding and enablement

Examples:

- startup onboarding
- agency training
- sales enablement
- customer education

Jobs:

- assign curated paths
- track progress
- keep content fresh
- standardize learning outcomes

## Priority framework

### P0: must exist for the product to deserve retention

| Feature | Why it matters | ICP | Moat impact | Monetization impact |
| --- | --- | --- | --- | --- |
| Saved library with folders, tags, filters | Users need durable organization before anything else matters | All | Medium | Medium |
| Public/private path visibility | Required for sharing and team use | Curators, teams | Medium | High |
| Scheduled playlist sync | Creates trust that paths stay accurate | All | High | High |
| Ghost/private/deleted video states | Makes failure explicit instead of silent | All | High | High |
| Replacement suggestions | Converts breakage into value | All | High | High |
| Path metadata editing | Users need to refine AI output | All | Medium | Medium |
| Path modules and rationale | Gives the product a clear "learning" identity | Self-learners | High | High |
| Notes per video / per module | Creates compounding value and revisit reasons | Self-learners, teams | High | High |
| Path progress tracking | Needed for completion loops | All | Medium | Medium |
| Share page with save / remix CTA | Turns content into acquisition | Curators | High | High |

### P1: the first serious differentiation layer

| Feature | Why it matters | ICP | Moat impact | Monetization impact |
| --- | --- | --- | --- | --- |
| Transcript-backed path summaries | Improves quality over title-only heuristics | Self-learners | High | Medium |
| Flashcards and short quizzes | Turns passive watching into active learning | Self-learners | Medium | High |
| Weekly review queue | Drives retention | Self-learners | Medium | High |
| Freshness score | Makes maintenance visible and defensible | All | High | Medium |
| Path version history | Important for trust and teams | Teams, curators | High | Medium |
| Fork/remix lineage | Creates network effects and path graph value | Curators | High | High |
| Chrome extension save + overlay | Reduces friction at the point of intent | All | Medium | High |
| One-click import from YouTube page | Same as above; improves top-of-funnel conversion | All | Medium | High |
| Email / in-app alerts for path changes | Gives users a reason to come back | All | Medium | Medium |
| Search across playlists, notes, and summaries | Turns PromptPlay into a real library | Self-learners, researchers | High | Medium |

### P2: premium depth

| Feature | Why it matters | ICP | Moat impact | Monetization impact |
| --- | --- | --- | --- | --- |
| Prerequisite gap detection | Strong learning value when it is accurate | Self-learners | High | High |
| Redundancy detection | Removes wasted watch time | Self-learners | Medium | Medium |
| "Skip if you know this" personalization | Improves efficiency for advanced users | Self-learners | Medium | High |
| Difficulty estimates | Improves sequencing and planning | Self-learners | Medium | Medium |
| Time budgeting / weekly study plans | Helps users finish paths | Self-learners | Medium | High |
| Assignments and due dates | Needed for teams and cohorts | Teams | Medium | High |
| Team analytics dashboard | Core B2B value | Teams | Medium | High |
| Branded path pages | Strong agency / coach / creator upsell | Curators, teams | Low | High |
| Certificate / completion artifacts | Useful for motivation and cohort programs | Teams, learners | Low | Medium |
| API / webhook integrations | Important for serious workflows later | Teams | Medium | Medium |

### P3: optional expansion

| Feature | Why it matters | ICP | Moat impact | Monetization impact |
| --- | --- | --- | --- | --- |
| Mobile app | Convenience, but not core until web + extension are strong | All | Low | Medium |
| Multi-format ingestion beyond YouTube | Broadens TAM but risks loss of focus | Researchers, teams | Medium | Medium |
| Creator monetization marketplace | Interesting long-term network play | Curators | Medium | Medium |
| Mentor / cohort live features | Could support community models | Coaches | Low | Medium |
| AI coach chat | Useful only after the knowledge layer is strong | Self-learners | Low | Medium |

## Winning feature package

If PromptPlay needs one product package that is strong enough to win paying users, it should be:

`Durable Learning Paths`

That package includes:

- import or generate a playlist
- structure it into modules
- tag and filter paths as the library grows
- explain the sequence
- track progress
- sync it in the background
- surface breakage
- suggest replacements
- store notes and summaries
- let users share or assign the result

This is meaningfully stronger than a one-shot AI playlist generator.

## Suggested feature sequencing

### Stage 1: trustworthy library

- folders and tags
- visibility controls
- ghost states
- replacement suggestions
- metadata editing
- public share pages

### Stage 2: retention and learning

- timestamped notes
- transcript summaries
- flashcards or short quizzes
- progress and review queue
- weekly digest or alerts

### Stage 3: distribution and workflow

- Chrome extension
- fork / remix public paths
- creator pages
- growth-oriented landing pages for public paths

### Stage 4: B2B and monetization

- workspaces
- assignments
- completion analytics
- branded pages
- billing and seat controls

## Features to reject early

- generic "chat with anything"
- summarizing PDFs, podcasts, and web pages before YouTube retention is strong
- social feed mechanics
- native mobile before the browser workflow is sharp
- complicated certificates before teams or cohorts exist

## Features most likely to create a moat

Ranked:

1. scheduled sync + repair recommendations
2. fork/remix/version history for public paths
3. transcript-backed prerequisite and redundancy analysis
4. cross-path search across notes and summaries
5. team assignment and analytics on curated paths

## Features most likely to drive acquisition

Ranked:

1. public path pages
2. fork/remix flow
3. Chrome extension
4. playlist health score checker
5. creator-curated collections

## Features most likely to drive paid conversion

Ranked:

1. scheduled sync and alerts
2. advanced notes, flashcards, quizzes
3. private paths and workspaces
4. team analytics and assignments
5. branded/public publishing controls
