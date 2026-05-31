# Research relevance score filter

Date: 2026-05-31

## Why this matters

The research command now has controls for depth, freshness, date windows, domains, and exact phrase matching. The next product-quality gap is result relevance after retrieval: a large or broad query can still return weak sources, and the current output hides the provider's relevance score from the agent.

## Current state

- Tavily returns `results[].score`, but the local adapter drops it.
- The agent cannot inspect score values when deciding which sources to cite.
- Callers cannot request a minimum relevance threshold.

## External evidence

- Tavily Search API examples include `score` on each result object. Source: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Tavily's Web Search Essentials guide describes search results as carrying relevance scores. Source: https://docs.tavily.com/examples/quick-tutorials/search-api
- Tavily's production notes recommend using `score` to filter low-relevance results, with an example threshold of discarding results below `0.5`. Source: https://docs.tavily.com/examples/quick-tutorials/search-api

## Upgrade decision

Add score preservation and an optional minimum score filter:

- `ResearchSource` includes optional `score`.
- API, CLI, and `/search` accept `minScore`.
- Daemon normalizes `minScore` to `0..1` and filters returned sources after provider normalization.
- The command contract shows `--min-score` when provided so agent runs stay reproducible.

## A/B test plan

- A: Current code returns low- and high-score sources alike and hides score metadata.
- B: After the change, Tavily scores survive into findings; `minScore` removes low-score sources and records the applied threshold.

## Non-goals

- No automatic default threshold.
- No reranking beyond Tavily's returned order.
- No source scoring across providers yet.
