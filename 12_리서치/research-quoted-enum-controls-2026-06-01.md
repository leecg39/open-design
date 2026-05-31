# Research quoted enum controls

## Insight

Tavily Search uses enum controls for `topic` and `search_depth`; Open Design also maps product `depth` onto those provider settings. User-facing command/API values can arrive with wrapping quotes or casing from copied shell snippets, so enum parsing should be as tolerant as country, time range, and date parsing.

Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B verification

- Before: focused tests failed because direct `topic: "\"News\""` and `searchDepth: "'FAST'"` fell back to omitted/default provider values, and core `depth: "\"Deep\""`/`topic: "'News'"` did not normalize cleanly.
- After: quoted/cased enum values normalize to `news`, `fast`, and `deep` without false warnings; invalid enum strings still warn and fall back.

## Upgrade applied

Added quote stripping and lower-case normalization to direct Tavily topic/search-depth parsing and high-level research depth/topic parsing.
