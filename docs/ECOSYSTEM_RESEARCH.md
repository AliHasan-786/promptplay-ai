# Ecosystem Research

Last updated: June 4, 2026

## Purpose

This document tracks the broader technical ecosystem around agents, multimodal apps, browser automation, voice, video, and durable workflows.

The goal is not to adopt every new tool.

The goal is to understand:

- what is mature now
- what is relevant to PromptPlay
- what is cool but premature

## Market pattern

The ecosystem is converging around a few ideas:

1. tool-using agents instead of prompt-only apps
2. durable workflows instead of single request/response calls
3. realtime voice and multimodal interaction
4. browser-native automation
5. better observability and evals
6. protocols like MCP for interoperability

PromptPlay should follow those shifts selectively, not blindly.

## Category 1: agent orchestration

### Anthropic

Signal:

- Anthropic's December 19, 2024 guidance argues that the most successful teams usually use simple, composable patterns rather than overcomplicated agent frameworks.
- They explicitly distinguish `workflows` from `agents`.

What it means for PromptPlay:

- stay simple at first
- use routing, evaluator-optimizer, and orchestrator-worker patterns where they genuinely help
- do not start with a flashy multi-agent architecture

### LangGraph

Signal:

- LangGraph positions itself as a low-level orchestration framework for long-running, stateful agents with persistence, streaming, memory, and human-in-the-loop support.

What it means for PromptPlay:

- useful reference model for future stateful agent workflows
- especially relevant if PromptPlay later needs agent graphs, approvals, or long-lived runs

### CrewAI

Signal:

- CrewAI emphasizes collaborative agents, crews, flows, guardrails, memory, and observability.

What it means for PromptPlay:

- good reference for multi-role agent design
- especially relevant for research, publishing, and team automation patterns

### AutoGen / Microsoft

Signal:

- Microsoft positions AutoGen as an open-source framework for building AI agents and coordinating multiple agents.
- The newer architecture emphasizes asynchronous, event-driven workflows and observability.

What it means for PromptPlay:

- strong conceptual reference for multi-agent collaboration patterns
- worth tracking, especially for workflow-heavy or enterprise use cases

### Pydantic AI

Signal:

- Pydantic AI now includes durable execution integrations and formal eval capabilities.
- Its docs explicitly describe durable agents that survive failures and support MCP and streaming.

What it means for PromptPlay:

- useful reference for typed agent architecture and durability
- especially good if PromptPlay later wants stronger eval discipline and durable Python-based workers

### Vercel AI SDK

Signal:

- Vercel is pushing a cohesive TypeScript stack around AI SDK, Workflows, AI Gateway, UI components, and secure sandbox execution.

What it means for PromptPlay:

- strong fit if the app becomes more AI-native on the frontend
- especially useful if the product wants long-running agents while staying TypeScript-first

### Cloudflare Agents + Workflows

Signal:

- Cloudflare is pushing durable execution, scheduled tasks, stateful agents, and workflow orchestration.
- Their June 2, 2026 Agents SDK release highlighted scheduled tasks, Workflows integration, and hardened recovery.

What it means for PromptPlay:

- highly relevant if PromptPlay grows into recurring research scans, sync agents, or always-on automations
- probably too early for a full platform shift today

## Category 2: browser agents and browser-native automation

### Browser Use

Signal:

- Browser Use is pushing persistent browser sessions, real Chrome profile reuse, and very fast direct-control CLI workflows.

What it means for PromptPlay:

- useful for QA, extension testing, authenticated automation, and future browser-native user flows
- good reference for YouTube-side save/progress/overlay automation

### Browserbase Stagehand

Signal:

- Stagehand focuses on readable, resilient browser agents and pairs with hosted infra that adds session replay, observability, and captcha handling.

What it means for PromptPlay:

- useful if PromptPlay ever runs production browser automations at scale
- stronger fit for operational tasks than for the core user product today

### Playwright

Signal:

- still the most pragmatic baseline for deterministic browser testing and automation

What it means for PromptPlay:

- should remain the main QA foundation
- use AI browser tools as complements, not replacements

## Category 3: voice and realtime agents

### LiveKit

Signal:

- LiveKit provides a realtime agent framework with web/mobile frontends, telephony support, and model-provider flexibility.
- It also offers a browser-based Agent Builder for fast prototyping.

What it means for PromptPlay:

- best current path for a serious voice tutor or oral exam mode
- especially strong if you want realtime rooms, co-watching, or spoken review

### ElevenLabs Agents

Signal:

- ElevenLabs is now explicitly positioning around agents that talk, type, and take action across phone, web, and apps.

What it means for PromptPlay:

- strong option for premium voice experiences
- better fit for engaging tutor modes than for general orchestration

### Google Gemini Live

Signal:

- Google is pushing more natural conversational voice experiences and app-connected assistance.

What it means for PromptPlay:

- validates voice as a serious UX surface
- suggests users will increasingly expect fluid voice interaction, not just static audio playback

## Category 4: video, overviews, avatars, and richer media UX

### NotebookLM

Signal:

- NotebookLM now has Audio Overviews, Video Overviews, public notebooks, featured notebooks, YouTube source support, and mobile share-to capture.
- This is important because it normalizes multimodal knowledge products, not just chat.

What it means for PromptPlay:

- strong validation for turning source collections into richer media outputs
- especially relevant for recap videos, public path trailers, and explainers

### Tavus

Signal:

- Tavus is pushing realtime video agents with low-latency conversational video and configurable personas / replicas.

What it means for PromptPlay:

- useful for a highly differentiated avatar tutor later
- cool, but expensive and not first-priority

### HeyGen

Signal:

- HeyGen continues pushing interactive avatars and API-driven talking video generation.

What it means for PromptPlay:

- useful for creator-facing publishing and explainer surfaces
- more interesting for marketing or public-path experiences than for the core app

### Runway

Signal:

- Runway's API gives product teams access to production-grade video generation.

What it means for PromptPlay:

- relevant for teaser trailers, module recap videos, or creator publishing workflows
- not required for the core learning product

## Category 5: protocols, standards, and interoperability

### Model Context Protocol

Signal:

- MCP is increasingly becoming the standard interface for connecting agents to external tools, knowledge, and systems.

What it means for PromptPlay:

- very important long term
- supports integration with Notion, Google Drive, Slack, Discord, and internal enterprise systems

## Category 6: evals and observability

### LangSmith

Signal:

- LangGraph and LangChain increasingly frame tracing, evaluation, and agent debugging as core infra.

What it means for PromptPlay:

- reinforces that agent quality needs measurement, not intuition

### Pydantic Evals

Signal:

- typed eval tooling is becoming a first-class product area, not an afterthought

What it means for PromptPlay:

- path quality, summary faithfulness, and replacement accuracy should all be measured systematically

### AutoGen observability / OpenTelemetry direction

Signal:

- Microsoft is emphasizing observability and debugging for multi-agent systems

What it means for PromptPlay:

- if agent workflows expand, traceability becomes mandatory

## What PromptPlay should adopt now

### Adopt

- transcript ingestion
- embeddings and semantic retrieval
- durable async jobs
- evals for path quality and summary quality
- stronger analytics on save, revisit, sync, and completion

### Experiment

- voice tutor / oral review
- weekly research digest agent
- public path trailer generation
- path repair agent
- public remix and comparison flows

### Watch

- video avatars
- full multi-agent operating environments
- general browser agents in the user-facing core product
- broad multi-format ingestion beyond YouTube

## Vendor-specific takeaways

### Best for PromptPlay right now

- Anthropic: architectural discipline
- LangGraph: stateful orchestration reference
- Cloudflare Workflows: durable agent patterns
- Vercel AI SDK: TypeScript-native AI app ergonomics
- LiveKit: realtime voice product path
- NotebookLM: proof that multimodal knowledge experiences can be mainstream
- Browser Use / Stagehand: browser-native patterns

### Best for future "wow" features

- ElevenLabs: spoken coach and voice personality
- Tavus: video tutor or avatar presenter
- Runway: polished recap and marketing assets
- HeyGen: creator-facing explainers and avatar content

## Recommended technical experiments

### Experiment A: path repair agent

Inputs:

- broken playlist items
- embeddings over similar videos
- path prerequisites

Why:

- high moat
- high user value

### Experiment B: voice sparring mode

Inputs:

- path notes
- module summaries
- quiz bank

Why:

- differentiated premium feature
- good fit for interview prep and certification users

### Experiment C: weekly channel digest

Inputs:

- subscribed channels or saved paths
- recent uploads
- summary and change detection

Why:

- extends PromptPlay into research and intelligence use cases

### Experiment D: path trailer generator

Inputs:

- path metadata
- module structure
- notes and highlights

Why:

- strong public distribution asset

## Strategic conclusion

The ecosystem is moving toward:

- more durable agents
- more multimodal interaction
- more browser-native execution
- more voice
- more observability

PromptPlay should follow that path in this order:

1. strengthen the learning-path core
2. add durable sync, notes, summaries, and retrieval
3. add public publishing and comparison loops
4. add voice and research modes
5. add richer agent and media experiences only after the core is sticky

## Research references

- Anthropic, "Building Effective AI Agents" (December 19, 2024): <https://www.anthropic.com/engineering/building-effective-agents>
- LangGraph overview: <https://docs.langchain.com/oss/python/langgraph/overview>
- CrewAI docs: <https://docs.crewai.com/>
- Microsoft AutoGen project: <https://www.microsoft.com/en-us/research/project/autogen/>
- Pydantic AI durable execution: <https://pydantic.dev/docs/ai/integrations/durable_execution/overview/>
- Vercel AI SDK: <https://vercel.com/ai-sdk>
- Cloudflare Workflows: <https://www.cloudflare.com/products/workflows/>
- Cloudflare Agents SDK v0.14.0 changelog (June 2, 2026): <https://developers.cloudflare.com/changelog/post/2026-06-02-agents-sdk-v0140/>
- Browser Use CLI: <https://docs.browser-use.com/open-source/browser-use-cli>
- Browserbase Stagehand: <https://www.browserbase.com/stagehand>
- LiveKit Agents: <https://docs.livekit.io/agents/>
- ElevenLabs Agents announcement (March 6, 2026): <https://elevenlabs.io/blog/introducing-elevenlabs-agents>
- NotebookLM public notebooks (June 3, 2025): <https://blog.google/technology/google-labs/notebooklm-public-notebooks/>
- NotebookLM Audio Overviews (September 11, 2024): <https://blog.google/innovation-and-ai/products/notebooklm-audio-overviews/>
- NotebookLM YouTube and audio source support (September 26, 2024): <https://blog.google/technology/ai/notebooklm-audio-video-sources/>
- NotebookLM app (May 19, 2025): <https://blog.google/technology/ai/notebooklm-app/>
- NotebookLM Video Overviews in 80 languages (August 25, 2025): <https://blog.google/innovation-and-ai/models-and-research/google-labs/notebook-lm-audio-video-overviews-more-languages-longer-content/>
- Gemini 3.5 (May 19, 2026): <https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-5/>
- Gemini app / Gemini Spark (May 19, 2026): <https://blog.google/innovation-and-ai/products/gemini-app/next-evolution-gemini-app/>
- Tavus CVI: <https://www.tavus.io/cvi>
- Tavus CVI docs: <https://docs.tavus.io/sections/conversational-video-interface/overview-cvi>
- HeyGen interactive avatar / realtime docs: <https://docs.heygen.com/reference/heygen-interactive-avatar-realtime-api>
- Runway API: <https://runwayml.com/api>
