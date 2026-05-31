# Tavily direct search depth options

## Insight

The current Tavily Search API supports four `search_depth` values: `basic`, `advanced`, `fast`, and `ultra-fast`. Open Design's direct Tavily helper type only exposed `basic` and `advanced`, while runtime request construction would still forward unsupported values if they arrived through an untyped internal path.

Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B verification

- Before: the focused direct Tavily test failed because `searchDepth: "slow"` was forwarded to the provider body.
- After: valid current provider depths such as `fast` are preserved, while unsupported values fall back to Open Design's default `basic` search depth.

## Upgrade applied

Expanded the direct helper search-depth type to the documented Tavily options and added runtime normalization before constructing the provider fetch body.
