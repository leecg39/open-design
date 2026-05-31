# Tavily direct zero max results

## Insight

Tavily Search documents `max_results` as an integer range from `0` to `20`. Open Design's high-level research workflow still needs source evidence by default, but the lower-level direct helper should preserve the provider's `0` option for answer-only or response-shape probes.

Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B verification

- Before: the focused direct helper test failed because `maxResults: 0` was sent as `max_results: 1`.
- After: the same request is sent as `max_results: 0`, while the existing upper provider cap remains `20`.

## Upgrade applied

Changed only the direct Tavily helper's lower `max_results` clamp from `1` to `0`. The product-level research path keeps its existing `maxSources` defaults and warnings.
