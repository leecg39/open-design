# Tavily direct boolean control normalization

## Insight

The direct Tavily helper previously relied on JavaScript truthiness for boolean controls. If an internal caller passed string values such as `"true"` or `"false"`, options like `exact_match`, `include_images`, `include_raw_content`, and `auto_parameters` could be enabled unintentionally. Invalid `includeAnswer` strings could also be forwarded to the provider.

Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B verification

- Before: the focused direct Tavily test failed because string boolean values turned on provider flags and invalid `includeAnswer` reached the request body.
- After: only literal `true` enables boolean provider flags, invalid answer modes fall back to the helper default `true`, and raw content remains disabled unless explicitly requested.

## Upgrade applied

Added runtime normalization for direct Tavily boolean controls and answer mode before constructing the provider fetch body.
