# Research depth upgrade — 2026-05-31

## Goal

Improve Open Design's research-grounded artifact loop so users can request deeper evidence when current external facts matter.

## Local finding

- `packages/contracts/src/api/research.ts` already exposes `ResearchDepth = 'shallow' | 'medium' | 'deep'` and depth-based default source counts.
- `apps/daemon/src/research/index.ts` currently hardcodes every research run to `depth: 'shallow'` and sends Tavily `search_depth: 'basic'`.
- `apps/daemon/src/prompts/research-contract.ts` and the `/search` composer prompt show only shallow output, so agents have no supported path for high-insight research.

## External evidence

- Tavily Search API docs: `include_answer` accepts `basic` or `advanced`, with `advanced` producing a more detailed answer. `search_depth` may be set explicitly to control relevance/cost. Source: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Tavily best-practices docs: `search_depth` is a latency/relevance tradeoff. `basic` is recommended for balanced general searches; `advanced` is recommended for specific, detailed queries. Source: https://docs.tavily.com/documentation/best-practices/best-practices-search
- Tavily best-practices docs also warn that setting `max_results` too high may lower quality, while the local Tavily adapter already caps returned results to 20.

## Decision

Implement depth support without adding a new provider:

- `shallow`: Tavily `basic`, quick answer, default 5 sources.
- `medium`: Tavily `advanced`, quick answer, default 12 sources.
- `deep`: Tavily `advanced`, detailed answer, default capped to Tavily's 20-result local limit.

## A/B criteria

- A: Current code returns `depth: 'shallow'` and sends Tavily `search_depth: 'basic'` even if callers ask for deeper research.
- B: After the change, CLI/API/composer metadata preserve `medium` and `deep`; Tavily receives `advanced` for medium/deep; deep requests use the detailed answer mode.

Only ship the code if unit tests prove B and existing shallow behavior remains unchanged.
