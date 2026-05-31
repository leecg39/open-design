# Research min score empty state

Date: 2026-05-31

## Product gap

The research API can apply `minScore` after Tavily returns results. If every provider result is below the requested score, the user currently sees the same generic "no sources found" failure as a true provider empty response.

## Evidence

- `minScore` is a local relevance-quality filter.
- A provider response with low-scoring sources is different from a provider response with no sources.
- Clear empty states help users decide whether to lower the threshold, broaden the query, or try a different filter.

## Upgrade decision

- Track how many sources Tavily returned before local `minScore` filtering.
- If `minScore` removes every source, return a specific error message explaining that the threshold filtered all provider results.
- Preserve the existing `NO_RESEARCH_SOURCES` code and 404 status so callers do not need a new branch.

## A/B validation

- A: true provider-empty results should keep the generic no-sources message.
- B: provider results filtered by `minScore` should return a threshold-specific message.

## Non-goals

- Do not return filtered-out source bodies in the error.
- Do not change the default `minScore` behavior.
