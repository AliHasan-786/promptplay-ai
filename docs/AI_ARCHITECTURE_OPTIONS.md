# AI Architecture Options

Last updated: June 4, 2026

## Goal

Identify the AI and systems capabilities PromptPlay can grow into without turning into a trend-chasing mess.

This document focuses on:

- agent architecture
- tool and protocol choices
- current ecosystem options
- what to adopt now versus later

## First principle

Do not add multiple agents because "agents are hot."

Use them only when they improve:

- quality
- durability
- throughput
- user trust
- margin

Anthropic's recent guidance is directionally right:

- start with a strong single agent
- only move to multi-agent when specialization clearly improves outcomes

## Recommended capability ladder

### Stage 1: single orchestrator + tools

Use one main agent with tool access for:

- playlist generation
- path generation
- sync decisions
- note and summary generation
- search and export tasks

This is the right place for PromptPlay today.

### Stage 2: async specialist jobs

Split long-running background work into specialized workers:

- ingestion worker
- embedding worker
- sync worker
- replacement worker
- summary worker

These do not need to be user-visible "agents."

### Stage 3: manager + specialists

Add multi-agent orchestration when the tasks are distinct enough:

- scout
- curator
- repair
- coach
- publisher

The manager should stay responsible for user-facing coherence.

### Stage 4: durable long-running agents

Only add this when PromptPlay genuinely needs:

- persistent scheduled research
- recurring path maintenance
- asynchronous team workflows
- human approval loops

## Technical capabilities worth adopting

### 1. Responses API and tool-based architecture

Why it matters:

- OpenAI's current platform direction is Responses + tools
- built-in tool support reduces custom glue
- easier path to web search, file search, and MCP integration

Good fit for PromptPlay:

- research workflows
- source-aware generation
- hybrid search + reasoning
- future MCP integrations

### 2. MCP compatibility

Why it matters:

- MCP is becoming the standard way to connect AI apps to external tools and systems
- it gives a future-proof integration layer

Good fit for PromptPlay:

- Notion export
- Google Drive / Docs integration
- Slack or Discord workflows
- internal content systems for team plans

### 3. Semantic search and embeddings

Why it matters:

- semantic retrieval is a strong product multiplier
- it makes notes, transcripts, and summaries more reusable

Good fit for PromptPlay:

- "find this concept"
- similarity recommendations
- duplicate / overlap analysis
- prerequisite detection

### 4. Durable background execution

Why it matters:

- sync and research scans are not request/response tasks
- long-running jobs need retries, checkpoints, and visibility

Good fit for PromptPlay:

- scheduled path health checks
- weekly research digests
- assignment reminders
- multi-step agent workflows

### 5. Realtime voice

Why it matters:

- voice is useful when the user is actively learning or reviewing
- it can make the product feel unusually alive

Good fit for PromptPlay:

- speak questions while watching
- dictate notes
- audio recap mode
- verbal quiz mode

### 6. Browser automation

Why it matters:

- browser control can help with testing, verification, and some research tasks
- it is also useful for extension QA and channel / page observation

Good fit for PromptPlay:

- automation around browser workflows
- QA of YouTube overlay experiences
- validating public pages and user flows

### 7. Evals and trace grading

Why it matters:

- if PromptPlay becomes more agentic, quality drift will become a real problem
- evals are infrastructure, not a nice-to-have

Good fit for PromptPlay:

- path quality scoring
- replacement suggestion evaluation
- summary quality regression checks
- agent workflow benchmarking

## Current ecosystem options

### Option A: Stay on current stack and selectively upgrade

Stack:

- React + Vite
- Supabase
- OpenAI SDK / Responses API
- Edge Functions

Use this when:

- speed and focus matter most
- you want minimal churn
- the product is not yet agent-infra heavy

Recommended for PromptPlay now:

- yes

### Option B: Add Vercel AI SDK on top of product services

What it gives:

- strong TypeScript ergonomics
- multi-step tool orchestration
- model/provider flexibility
- workflows and sandbox options if you move deeper into agents

Use this when:

- you want a TypeScript-native agent layer
- you need better streaming / tool orchestration ergonomics
- you may build richer AI-native UI

Recommended for PromptPlay now:

- maybe later
- strong candidate if the app becomes more agent-heavy or moves toward Next.js

### Option C: Cloudflare durable agents style architecture

What it gives:

- durable execution
- subagents
- persistent sessions
- scheduled tasks
- workflow integration

Use this when:

- the product becomes long-running and event-heavy
- you want always-on agents or recurring automation

Recommended for PromptPlay now:

- too early as a full architecture shift
- worth watching for future "agent OS" features

### Option D: Open-weight or BYOK mode

What it gives:

- privacy options
- lower marginal cost in some cases
- flexibility for enterprise users

Use this when:

- teams want private deployments
- users are cost-sensitive power users
- you want experimentation with custom model routing

Recommended for PromptPlay now:

- only as a future power-user or enterprise feature

## Latest tools and what they mean for PromptPlay

### OpenAI Responses API + tools

Why relevant:

- modern tool architecture
- built-in web search, file search, MCP, and tool workflows

PromptPlay use:

- research mode
- update scanning
- source synthesis

### OpenAI Agents SDK

Why relevant:

- stronger harness for tool-heavy agents
- sandbox execution and durable state direction

PromptPlay use:

- future research / repair / publishing agents

### OpenAI Realtime API

Why relevant:

- speech-to-speech and low-latency multimodal interaction

PromptPlay use:

- voice tutor
- spoken review
- live note dictation

### Model Context Protocol

Why relevant:

- standard integration surface for tools and external systems

PromptPlay use:

- integrations without bespoke connector logic for everything

### Supabase embeddings + vector search

Why relevant:

- fast path to semantic retrieval on top of current stack

PromptPlay use:

- transcript search
- note search
- path comparison
- recommendation quality

### Vercel AI SDK / Workflows / Sandbox

Why relevant:

- cohesive TypeScript-heavy AI app tooling
- good developer ergonomics for agents

PromptPlay use:

- if the app becomes more AI-native in its frontend and orchestration

### Cloudflare durable agent patterns

Why relevant:

- strong durability for long-running agents and scheduled tasks

PromptPlay use:

- future always-on scouts, recurring digests, and persistent assistants

### Playwright

Why relevant:

- reliable browser automation for QA and product workflows

PromptPlay use:

- extension testing
- public path testing
- end-to-end regression coverage

## Recommended agent designs

### Design 1: Research Copilot

Input:

- topic, channels, playlists, recency window

Tools:

- web search
- transcript search
- internal knowledge store
- export tools

Outputs:

- weekly brief
- source list
- notable clips
- emerging themes

### Design 2: Path Repair Agent

Input:

- saved path

Tools:

- YouTube metadata fetch
- semantic similarity over candidate replacements
- path rules and prerequisites

Outputs:

- broken item alerts
- ranked replacements
- path health score changes

### Design 3: Learning Coach Agent

Input:

- user progress
- notes
- path structure

Tools:

- summaries
- flashcard store
- quiz generator
- scheduling rules

Outputs:

- review queue
- personalized next step
- reminder or digest

### Design 4: Publisher Agent

Input:

- saved path and metadata

Tools:

- formatting templates
- SEO metadata
- public page builder

Outputs:

- polished public path page
- share copy
- optional newsletter / post draft

## Evals you should build

### Product evals

- playlist relevance
- path sequencing quality
- prerequisite accuracy
- replacement suggestion quality
- summary faithfulness

### Workflow evals

- tool selection correctness
- failure recovery
- retry success
- latency and cost budgets

### User-value evals

- does this reduce time to first useful path?
- does this increase revisit rate?
- does this improve completion?

## Recommended adoption plan

### Adopt now

- OpenAI Responses API direction
- semantic retrieval with pgvector
- transcript pipeline
- durable async job model
- evals for generation quality

### Experiment soon

- path repair agent
- research digest agent
- public publisher agent
- voice note dictation

### Watch, but do not overcommit yet

- full durable multi-agent platform shift
- broad multi-source ingestion
- self-hosted / BYOK model infrastructure
- rich computer-use agents for end users

## Best near-term technical bet

For PromptPlay, the highest-leverage combination is:

1. keep the current app stack
2. migrate AI workflows toward Responses-style tool orchestration
3. add embeddings and transcript search
4. build async workers for sync, summaries, and repair
5. add evals before adding many more agent behaviors

That path gives most of the upside of "modern AI product architecture" without paying the cost of a premature rewrite.
