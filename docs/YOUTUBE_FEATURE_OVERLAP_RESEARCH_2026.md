# YouTube Feature Overlap Research

Last updated: June 19, 2026

## Goal

Before building more PromptPlay features, we need to avoid any wedge YouTube has already covered or is clearly moving toward.

This research cross-references:

- 2025-2026 user complaints
- YouTube features already available as of June 19, 2026
- YouTube announced or experimental roadmap items
- remaining product whitespace

## Executive conclusion

Do not compete on:

- prompt-generated feeds
- conversational video search
- chat with YouTube videos
- generic AI summaries
- basic recommendation controls
- basic screen-time controls
- basic playlist creation
- Shorts blocking alone

YouTube is already moving hard into all of those.

The strongest remaining opportunity is:

`AI decision infrastructure for personal media consumption`

Better phrasing:

`PromptPlay helps users decide what deserves attention, preserve what matters, and convert media chaos into intentional actions.`

The AI should not primarily be a chatbot. It should be an interaction composer that creates:

- decisions
- cards
- rules
- queues
- audit surfaces
- tradeoff panels
- digests
- "keep / skip / summarize / archive / repair" workflows

## Current YouTube coverage as of June 19, 2026

### 1. Prompt-generated custom feeds

YouTube now lets signed-in U.S. users with watch/search history enabled create a custom feed by entering a prompt. The feed can be edited, refreshed, pinned as a chip on Home, and watched videos feed back into regular recommendation history.

Implication:

- PromptPlay should not be "type what you want and get videos."
- PromptPlay should treat YouTube custom feeds as an input source.

Sources:

- YouTube Help: https://support.google.com/youtube/answer/17081258
- YouTube announcement: https://support.google.com/youtube/thread/436892232/introducing-a-new-discovery-experience-designed-by-you
- The Verge: https://www.theverge.com/streaming/938759/youtube-custom-ai-feed-prompt-availability
- 9to5Google: https://9to5google.com/2026/05/27/youtube-adds-custom-feed-to-home-page/

### 2. Ask YouTube and conversational search

YouTube announced Ask YouTube at Google I/O 2026. It handles complex natural-language searches, follow-up questions, structured responses, long-form videos, Shorts, and timestamped or thematic results. YouTube also has a conversational AI tool for asking questions about currently watched videos, including on smart TVs.

Implication:

- PromptPlay should not be "ChatGPT for YouTube search."
- PromptPlay should not rely on Q&A as its core interaction.
- If we use chat, it should be secondary to action cards and workflow UI.

Sources:

- YouTube I/O 2026 blog: https://blog.youtube/news-and-events/youtube-news-google-io-2026/
- Ask YouTube Help: https://support.google.com/youtube/answer/16943763
- Conversational AI tool Help: https://support.google.com/youtube/answer/14110396
- YouTube conversational AI on TVs: https://blog.youtube/news-and-events/youtube-conversational-ai-tool-available-smart-tvs/
- The Verge coverage: https://www.theverge.com/streaming/919441/google-ask-youtube-ai-chatbot-search

### 3. AI-powered search carousels and summaries

YouTube introduced AI-powered search result carousels in 2025 for travel, shopping, and local discovery-style queries, with AI descriptions and creator video suggestions.

Implication:

- "Find me videos about X" and "summarize the search space" are commoditized.
- PromptPlay needs a layer after discovery: triage, decision, preservation, accountability.

Sources:

- YouTube summer 2025 AI tools: https://blog.youtube/news-and-events/new-youtube-ai-tools-summer-2025/
- TechCrunch coverage: https://techcrunch.com/2025/06/26/youtube-adds-an-ai-overviews-like-search-results-carousel/
- The Verge coverage: https://www.theverge.com/news/693658/youtube-search-ai-overviews-google

### 4. Recommendation controls

YouTube offers watch/search history management, Not interested, Don't recommend channel, topic chips, and now prompt-based custom feeds. Mozilla's research and Reddit complaints still show that users often feel controls are indirect, incomplete, or hard to reason about.

Implication:

- "More control over recommendations" is too generic now.
- PromptPlay should focus on explicit user policies that YouTube does not persist or enforce across workflows:
  - no videos above X minutes unless high-signal
  - no repeated channels this week
  - no Shorts during work mode
  - only fresh videos for time-sensitive topics
  - summarize instead of watch if confidence is medium

Sources:

- Mozilla YouTube controls study: https://www.mozillafoundation.org/en/youtube/user-controls/
- Wired on Mozilla study: https://www.wired.com/story/youtube-dislike-button-mozilla-research/
- Watch history Help: https://support.google.com/youtube/answer/95725
- Reddit recommendation repetition complaint: https://www.reddit.com/r/youtube/comments/1tiwf38/yt_recommendations_make_it_feel_like_youtube_is/
- Reddit search and recommendations complaint: https://www.reddit.com/r/youtube/comments/1pnla8t/is_everyone_else_having_this_same_experience_with/

### 5. Screen-time and Shorts controls

YouTube has break reminders, bedtime reminders, Time Watched, and in 2026 added a Shorts feed limit that can be set to zero minutes on mobile.

Implication:

- Basic digital well-being is not a wedge.
- The gap is intent-aware attention routing:
  - "I opened YouTube for a repair tutorial; route me there and close the loop."
  - "I have 20 minutes and want entertainment without a Shorts spiral."
  - "I can watch one long video or three short ones; choose based on my declared goal."

Sources:

- YouTube bedtime reminder Help: https://support.google.com/youtube/answer/9884905
- YouTube time-management announcement: https://support.google.com/youtube/thread/48055830/bedtime-reminders-other-features-to-help-you-manage-screen-time
- The Verge on zero-minute Shorts limit: https://www.theverge.com/streaming/912898/youtube-shorts-feed-limit-zero-minutes
- MediaPost on Shorts feed limit: https://www.mediapost.com/publications/article/414369/youtube-lets-users-remove-shorts-from-its-home-fee.html

### 6. Playlist, Watch Later, and queue tools

YouTube supports playlists, Watch Later, and session queues. But user complaints persist around save-to-playlist friction, Watch Later backlogs, sorting/removal issues, and fragile queue behavior.

Implication:

- Basic playlist management is covered.
- AI-assisted backlog triage is not covered well:
  - detect stale videos
  - detect duplicates
  - summarize-before-watch
  - archive low-value saves
  - repair dead/private items
  - cluster 500 saved videos into decisions
  - preserve metadata when items disappear

Sources:

- YouTube playlists Help: https://support.google.com/youtube/answer/57792
- YouTube queue Help: https://support.google.com/youtube/answer/9546304
- Reddit save-to-playlist complaint: https://www.reddit.com/r/youtube/comments/1o8v446/rant_why_did_youtube_make_this_terrible_update_on/
- Reddit Watch Later ordering complaint: https://www.reddit.com/r/youtube/comments/1plncv4/anyone_else_having_trouble_editing_their_watch/
- Reddit Watch Later removal complaint: https://www.reddit.com/r/youtube/comments/1s4f8vw/has_anyone_else_lost_the_ability_to_add_to_your/
- Watch Later Organizer extension: https://chromewebstore.google.com/detail/youtube-watch-later-organ/epadolfipfmnbcoglbpnlnbpiohgbibg

### 7. AI slop and content authenticity

YouTube's CEO letter names AI safeguards and content quality as priorities. Coverage of the 2026 roadmap highlights AI creation tools, AI likenesses for Shorts, content labels, and attempts to combat low-quality AI-generated content.

Implication:

- YouTube will address platform-wide AI slop, especially policy and creator safeguards.
- PromptPlay can still offer user-specific trust filtering:
  - "never show faceless AI recap channels"
  - "prefer primary sources"
  - "flag possible AI dubbing"
  - "rank by channel trust and source proximity"
  - "show why this was judged low-signal"

Sources:

- YouTube CEO 2026 letter: https://blog.youtube/inside-youtube/the-future-of-youtube-2026/
- Google recap: https://blog.google/products-and-platforms/products/youtube/neal-mohan-letter-2026/
- The Verge on 2026 AI plans: https://www.theverge.com/news/864610/youtube-shorts-ai-likenesses-neal-mohan-2026
- Reddit AI slop complaint: https://www.reddit.com/r/youtube/comments/1rg3my5/goodbye_youtube_you_ruined_it_with_your_ai_slop/

## Complaint-to-opportunity matrix

| Complaint or unmet need | YouTube already offers | Do not build | Real whitespace |
| --- | --- | --- | --- |
| "My recommendations are bad" | custom feed, topic chips, history controls, Not interested | better recommendation feed | user-defined policy engine and decision memory |
| "I want to find videos by asking AI" | Ask YouTube, AI search carousel, video Q&A | YouTube search chatbot | post-discovery triage and action system |
| "I watch too much Shorts" | Shorts zero-minute limit, break/bedtime reminders | basic blocker | intent-aware session router and end-of-session closure |
| "Watch Later is huge" | Watch Later, playlists, remove watched | playlist clone | backlog liquidation, summarize/archive/repair decisions |
| "Search is less chronological/fresh" | time filters, Ask YouTube, AI search | search replacement | freshness audit, source watchdog, saved search digests |
| "Videos disappear/go private" | unavailable items may show but weak metadata | simple sync only | preservation record, replacement agent, dead-link archive |
| "AI slop is everywhere" | platform-level labels/safeguards | generic slop rant | personal trust graph and source quality scoring |
| "I saved this but never used it" | playlists and Watch Later | more folders | capture-time intent and resurfacing contract |
| "I do not want a course" | YouTube Courses, educational content, learning recs | learning-path-only positioning | mode-based media decisions: relax, research, fix, shop, decide, archive |
| "I want useful parts without opening YouTube" | summaries and Ask inside YouTube | generic summaries | external digest: watch/skim/ignore with action buttons |

## Strongest non-obvious opportunities

### 1. Decision memory

Problem:

YouTube remembers what you watched. It does not remember why you skipped, archived, trusted, distrusted, summarized, deferred, or regretted a video.

PromptPlay opportunity:

- build a personal decision graph:
  - skipped because repetitive
  - summarized because low commitment
  - watched because high trust
  - archived because stale
  - repaired because original disappeared
  - blocked because channel was low-signal

Why YouTube is unlikely to do it:

- It creates friction and encourages less watching.
- It emphasizes negative judgment and user-defined exclusion rules.

MVP:

- each imported video gets a suggested action: watch, skip, summarize, archive, repair
- user decisions train future queue audits

### 2. Backlog liquidation

Problem:

Users have hundreds or thousands of saved videos. They do not need recommendations. They need a bankruptcy proceeding.

PromptPlay opportunity:

- turn a playlist into:
  - keep pile
  - summarize pile
  - archive pile
  - repair pile
  - weekend pile
  - "delete guilt saves" pile

Why YouTube is unlikely to do it:

- It would tell users not to watch a large amount of saved inventory.

MVP:

- import playlist
- compute backlog hours
- cluster by topic/channel/age
- produce decision cards
- export new cleaned playlists

### 3. Intent contract

Problem:

The user opens YouTube with a vague intent and the platform turns it into a session.

PromptPlay opportunity:

- before YouTube opens, ask:
  - what are you here for?
  - how much time?
  - strict or flexible?
  - allowed rabbit-hole depth?
  - watch, skim, or decide?

Why YouTube is unlikely to do it:

- It makes the user more deliberate and easier to stop.

MVP:

- homepage card that turns a goal plus time budget into a short queue
- extension later replaces Home with the intent queue

### 4. Trust and provenance layer

Problem:

YouTube can label platform-wide AI/synthetic content, but it cannot know each user's trust preferences.

PromptPlay opportunity:

- personal content constitution:
  - prefer primary sources
  - avoid faceless AI recap channels
  - flag sponsor-heavy content
  - require freshness for fast-moving topics
  - mark "watched but not trusted"

Why YouTube is unlikely to do it:

- It would create a user-owned reputation layer over YouTube's ecosystem.

MVP:

- channel trust labels
- video quality badges
- "why this may be low-signal" explanation

### 5. Media after-action review

Problem:

YouTube tracks watch history, but it does not close the loop.

PromptPlay opportunity:

- after a session:
  - what was worth it?
  - what should be archived?
  - what should be summarized instead next time?
  - what did this change in your queue?
  - what should be blocked?

Why YouTube is unlikely to do it:

- It creates reflection and quitting points.

MVP:

- after watching/opening a video from PromptPlay, show a quick review:
  - worth it / not worth it
  - save insight
  - block similar
  - next action

### 6. Cross-platform media inbox

Problem:

Users discover media across YouTube, TikTok, Reddit, X, newsletters, group chats, podcasts, and articles.

PromptPlay opportunity:

- one inbox for "things I may want to watch/read/listen to"
- send a link by iMessage, email, browser extension, share sheet, Discord, or Telegram
- AI triages into action states

Why YouTube is unlikely to do it:

- It is YouTube-external and user-owned.

MVP:

- email/link capture endpoint
- browser extension save action
- in-app inbox with AI triage

## Interaction layer direction

The product should not be chat-first.

Use chat only when the user genuinely needs open-ended language. The primary UI should be generated workflows:

- cards
- chips
- mode selectors
- audit panels
- decision queues
- scorecards
- agent disagreement panels
- one-question-at-a-time elicitation

This aligns with the broader 2025-2026 AI UI direction:

- A2UI: agents generate task-appropriate UI as declarative data.
- AG-UI: standardizes agent-user interaction and real-time app state.
- MCP Apps and MCP UI: push interactive components into AI workflows instead of text-only responses.

Sources:

- Google A2UI: https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/
- A2UI protocol site: https://a2ui.org/
- AG-UI GitHub: https://github.com/ag-ui-protocol/ag-ui
- MCP Apps: https://blog.modelcontextprotocol.io/posts/2025-11-21-mcp-apps/
- Shopify MCP UI: https://shopify.engineering/mcp-ui-breaking-the-text-wall

## Recommended product concept

Name ideas:

- PromptPlay Attention OS
- PromptPlay Queue Doctor
- PromptPlay Media Control Room
- PromptPlay Watch Less Better
- PromptPlay Signal Desk

Best product framing:

`An AI control room for deciding what deserves your attention.`

Primary workflow:

1. Capture/import media.
2. AI audits it into decisions.
3. User applies actions through generated UI cards.
4. PromptPlay remembers the decision.
5. Future queues use the user's rules and history.

Primary states:

- Watch
- Skim
- Summarize
- Archive
- Repair
- Compare
- Block source
- Save for context

## What to build next

Build an `Attention Audit` that is deliberately not a learning path.

Inputs:

- playlist URL
- saved playlist
- freeform goal
- optional time budget

Outputs:

- total attention cost
- stale/dead/private count
- repeated channel count
- likely duplicate/redundant items
- low-signal risk
- suggested actions per item
- "today queue" of 1-5 items
- rules suggested for the user

Interaction:

- not a chat response
- a board of cards with actions
- one compact AI panel explaining tradeoffs
- user can apply actions and train preferences

Why this is defensible:

- YouTube can generate feeds and answer questions.
- PromptPlay owns the user's saved intent, decision memory, and cross-session media control layer.

