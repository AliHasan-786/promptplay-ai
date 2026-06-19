# AI Interaction Layer Research

Last updated: June 19, 2026

## Core question

PromptPlay should not just ask, "How do we use AI to find videos?"

The better question:

`What new interaction layer should exist between people, feeds, saved media, and AI?`

Read this alongside [YouTube feature overlap research](./YOUTUBE_FEATURE_OVERLAP_RESEARCH_2026.md). The point is not to build generic recommendation controls. YouTube already has custom feeds, history controls, Not interested, Don't recommend channel, Shorts limits, and Ask YouTube. The point is to build a decision and workflow layer that YouTube is structurally unlikely to own.

The answer should avoid:

- chat as the default interface
- course-heavy positioning
- another infinite feed
- generic summaries
- generic recommendation lists

## 2025-2026 complaint clusters

### 1. "YouTube gives controls, but not persistent decision policy"

Mozilla's YouTube user-control work found that people often take a trial-and-error approach to controls like Dislike and Not Interested, and still do not feel in control. Since then, YouTube has added stronger controls like prompt-generated custom feeds and Shorts limits. That means "control my recommendations" is no longer specific enough.

Product implication:

- PromptPlay should focus on explicit decision policy:
  - why a video was skipped
  - why it was summarized instead of watched
  - why a channel is trusted or distrusted
  - when stale videos should be archived
  - what kind of content is allowed in a session
- The interface should be built around rules, modes, decisions, and memory, not passive recommendations.

Sources:

- Mozilla YouTube User Control Study: https://www.mozillafoundation.org/en/youtube/user-controls/
- Mozilla report PDF: https://assets.mofoprod.net/network/documents/Mozilla-Report-YouTube-User-Controls.pdf
- Wired coverage: https://www.wired.com/story/youtube-dislike-button-mozilla-research

### 2. "I spend too much time and regret it"

Pew's 2025 research found 45% of teens say they spend too much time on social media, up from prior years, and many report negative effects on sleep, productivity, mental health, and confidence.

Product implication:

- The product should help users spend time better, not just consume more.
- The strongest promise is "reduce regret and waste," not "more content."

Sources:

- Pew teens, social media, and mental health: https://www.pewresearch.org/internet/2025/04/22/teens-social-media-and-mental-health/
- Pew 10 facts about teens and social media: https://www.pewresearch.org/short-reads/2025/07/10/10-facts-about-teens-and-social-media/
- CDC screen time and health outcomes: https://www.cdc.gov/pcd/issues/2025/24_0537.htm

### 3. "Watch Later is a graveyard"

User complaints and extension-market evidence show persistent pain around large saved-video backlogs, poor playlist management, and difficulty cleaning, searching, or triaging saved videos.

Product implication:

- "Watch Later Bankruptcy" is a strong activation hook.
- People can understand immediate value: import the mess, audit the mess, clean the mess.

Sources:

- Reddit Watch Later backlog: https://www.reddit.com/r/youtube/comments/1rye5x8/so_when_are_you_going_to_watch_your_watch_later/
- YouTube Watch Later Tidy extension: https://chromewebstore.google.com/detail/youtube-watch-later-tidy/fkelmapobieliokjcmnilmjllacmbfjo
- PocketTube playlist manager: https://chromewebstore.google.com/detail/pockettube-youtube-playli/bplnofkhjdphoihfkfcddikgmecfehdd

### 4. "Blocking tools are useful but dumb"

Unhook claims 1,000,000+ active users and 5,000+ reviews for blocking YouTube recommendations, comments, Shorts, and other distractions. one sec and Freedom validate the larger digital self-control category.

Product implication:

- Demand exists for controlling YouTube.
- The opportunity is a smarter layer that does not only block. It can choose, rank, summarize, queue, schedule, and explain.

Sources:

- Unhook: https://unhook.app/
- one sec: https://one-sec.app/
- Freedom: https://freedom.to/

### 5. "AI slop and low-signal content make quality harder"

Users increasingly need a quality filter, not another source of content.

Product implication:

- PromptPlay can score "worth watching" with signals like channel trust, redundancy, age, transcript density, clickbait, and whether the video matches the user's intent.

Source:

- Guardian AI slop coverage: https://www.theguardian.com/technology/2025/dec/27/more-than-20-of-videos-shown-to-new-youtube-users-are-ai-slop-study-finds

## Interaction-layer research

### 1. Generative UI

Generative UI lets agents respond with dynamic UI components instead of plain text. Google's A2UI is a framework-agnostic protocol for declaring UI intent. AG-UI standardizes agent-user interaction. Shopify's MCP UI work argues that interactive components break the "text wall."

What this means for PromptPlay:

- Do not make the AI answer in paragraphs.
- Make the AI assemble controls: queue cards, sliders, tradeoff chips, audit panels, "watch/skip/summarize/archive" actions, mode selectors, and confidence indicators.

Sources:

- Google A2UI v0.9: https://developers.googleblog.com/a2ui-v0-9-generative-ui/
- Google A2UI intro: https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/
- AG-UI docs: https://docs.ag-ui.com/introduction
- Shopify MCP UI: https://shopify.engineering/mcp-ui-breaking-the-text-wall
- MCP Apps: https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/

### 2. Human-in-the-loop elicitation

MCP elicitation supports nested user input during a workflow. The important design lesson is that the user should not have to write a new prompt every time. The system should ask for the next minimum useful choice.

What this means for PromptPlay:

- Ask one decision at a time:
  - "Are you here to relax, research, learn, or clean up?"
  - "Do you have 10, 30, or 60 minutes?"
  - "Strict or flexible?"
  - "Archive low-confidence items automatically?"

Source:

- MCP elicitation spec: https://modelcontextprotocol.io/specification/2025-06-18/client/elicitation

### 3. Interruptive interfaces

one sec works by inserting a reflective pause before unconscious app use. This is not chat; it is a timing-aware intervention.

What this means for PromptPlay:

- The best interface may happen before YouTube opens.
- Browser extension flow:
  1. User opens YouTube.
  2. PromptPlay asks intent.
  3. PromptPlay opens a queue, not the homepage.
  4. At the end, it asks "done, continue, or close?"

Sources:

- one sec: https://one-sec.app/
- one sec app behavior: https://one-sec.app/how-one-sec-works/

### 4. Inbox / kanban / deck interfaces

People understand triage from email and task managers. Media queues should behave more like an inbox than a chat.

What this means for PromptPlay:

- Every video gets one of a few states:
  - watch
  - summarize
  - archive
  - repair
  - save for a specific context
  - never recommend again

This is more actionable than "here is a summary."

## Interaction layer concepts

### Concept 1: Attention OS

Primary surface:

- mode cards instead of chat:
  - Clean backlog
  - Watch intentionally
  - Research a topic
  - Entertainment without spiral
  - Keep up with subscriptions

AI role:

- generate the right UI for the selected mode
- propose rules
- create a queue
- explain tradeoffs

Why it is interesting:

- It reframes PromptPlay as the user's command center, not another feed.

### Concept 2: Queue Doctor

Primary surface:

- audit cards for a playlist or saved queue
- each card has a recommended action

Actions:

- watch now
- summarize instead
- archive
- replace
- group with related videos
- move to weekend

AI role:

- judge value, duplication, freshness, actionability, and likely regret

Why it is interesting:

- It turns AI into a decision engine, not a content generator.

### Concept 3: AI Agents As Internal Panel

Primary surface:

- not chat with one assistant
- a small decision panel:
  - Curator: "this is worth your time"
  - Skeptic: "this is likely redundant"
  - Archivist: "save the metadata because it may disappear"
  - Timekeeper: "this breaks your budget"

AI role:

- surface disagreement and tradeoffs before the user spends time

Why it is interesting:

- Media decisions are subjective. A single "best" answer is less trustworthy than visible tradeoffs.

### Concept 4: Intent Contract

Primary surface:

- before a session, user chooses:
  - purpose
  - time budget
  - vibe
  - strictness
  - allowed rabbit-hole depth

AI role:

- enforce the contract and shape the queue

Why it is interesting:

- This changes the relationship from "what should I watch?" to "hold me to what I said I wanted."

### Concept 5: Ambient Capture

Primary surface:

- send a YouTube link to an iMessage, WhatsApp, Discord, or email address
- PromptPlay replies with action buttons:
  - save
  - summarize
  - queue tonight
  - archive
  - add to project

AI role:

- process media at the moment of capture, not only inside the web app

Why it is interesting:

- Users do not want to open another dashboard every time.

## Recommended build direction

Build `Attention OS` as the umbrella.

First productized interaction:

`Intent Deck`

The Intent Deck should be a non-chat UI that:

1. asks for the user's current mode
2. asks for time budget and strictness
3. produces an "AI-generated surface" of cards:
   - Intent Contract
   - Today's Queue
   - Skip / Summarize / Archive recommendations
   - Agent Panel tradeoffs
   - Rules the user can toggle
4. lets the user import a playlist into this flow

This can sit above the existing playlist library as a product lab while we test whether users respond to the new framing.

## Why this is stronger than learning paths

Learning paths imply school, work, and effort.

Attention OS covers:

- entertainment
- research
- learning
- cleanup
- subscriptions
- creator research
- hobbies
- sports analysis
- music discovery
- shopping/review videos
- travel planning

The common job is not "teach me."

The common job is:

`Help me decide what deserves my attention.`
