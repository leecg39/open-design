# Research country boost control

Date: 2026-05-31

## Why this matters

Open Design research now controls depth, freshness, exact dates, domains, exact phrases, and relevance score. For product strategy and market research, the next quality gap is geography: the same query can need Korean, US, Japanese, or EU-heavy source weighting.

## Current state

- `/search` cannot express a regional market preference.
- Users can write a country name in the query text, but that is weaker than structured provider metadata and cannot be reproduced cleanly from run metadata.

## External evidence

- Tavily Search API supports `country`, described as boosting results from a specific country. Source: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Tavily documents `country` as available only when `topic` is `general`. Source: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Tavily best-practices docs list `country` as a search-control parameter for country-specific boosting. Source: https://docs.tavily.com/documentation/best-practices/best-practices-search

## Upgrade decision

Add a structured country boost without changing default behavior:

- API and contracts accept optional `country`.
- Daemon normalizes common aliases like `kr`, `korea`, `us`, and `uk`.
- Daemon forwards `country` to Tavily only for general-topic searches.
- CLI accepts `--country <name>`.
- `/search` accepts `--country`, plus shortcuts `--kr`, `--us`, and `--uk`.

## A/B test plan

- A: Current code can only embed geography into query text.
- B: After the change, `country` survives metadata and command contracts, and Tavily receives `country` only for general-topic requests.

## Non-goals

- No exhaustive country picker UI.
- No automatic country inference from user locale.
- No country forwarding for `news` or `finance`, matching Tavily's documented boundary.
