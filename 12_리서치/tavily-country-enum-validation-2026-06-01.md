# Tavily country enum validation

## Insight

Tavily Search documents `country` as a fixed list of supported country names, not arbitrary free text. Open Design previously accepted any alphabetic word sequence, so values like `atlantis` could pass through the web composer, command contract, daemon research API, and direct Tavily helper before failing at the provider boundary.

Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B verification

- Before: focused tests failed because unsupported country values were forwarded as `country: "atlantis"`.
- After: unsupported country boosts are omitted early, web/parser flows warn the user, and supported aliases like `kr` still normalize to `south korea`.

## Upgrade applied

Added the current Tavily-supported country list to the pure contracts package and reused it across web, daemon research, command-contract rendering, and direct Tavily request normalization. This keeps validation consistent without duplicating a provider enum in each layer.
