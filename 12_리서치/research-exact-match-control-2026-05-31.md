# Research exact-match control

Date: 2026-05-31

## Why this matters

Open Design research now controls depth, freshness, exact dates, and domains. The next accuracy gap is entity ambiguity: company names, product SKUs, people, quoted phrases, and model names often get semantically expanded into nearby but wrong results.

## Current state

- `/search` can pass structured filters, but it cannot request strict phrase matching.
- Users can type quotes into the query, yet the provider is still free to return synonym or semantic-neighbor results unless exact matching is enabled.

## External evidence

- Tavily Search API supports `exact_match`, a boolean option that keeps only results containing the exact quoted phrase or phrases in the query. Source: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Tavily docs specifically frame `exact_match` as a way to bypass synonyms and semantic variations for quoted phrases such as a person or company lookup. Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## Upgrade decision

Add an explicit exact-match control:

- API and contracts accept `exactMatch`.
- Daemon forwards it to Tavily as `exact_match: true` only when requested.
- CLI accepts `--exact-match`.
- `/search` accepts `--exact-match` and includes it in the agent command contract.

## A/B test plan

- A: Current code can carry quotes only as query text; the Tavily request body has no strict phrase-match signal.
- B: After the change, caller metadata preserves `exactMatch`, prompts show `--exact-match`, and Tavily receives `exact_match: true` only when requested.

## Non-goals

- No automatic quote insertion.
- No natural-language exact-match inference.
- No result post-filtering in the daemon.
