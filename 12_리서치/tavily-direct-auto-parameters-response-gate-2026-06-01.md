# Tavily direct auto-parameters response gate

## Insight

Tavily Search treats `auto_parameters` as a boolean request control and may return provider-selected parameters in `auto_parameters`. The direct helper already rejected non-boolean request inputs, but response metadata gating still looked at the original truthy input value.

Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B verification

- Before: the focused test failed because `autoParameters: "true"` did not send `auto_parameters`, yet response `selectedParameters` was still exposed.
- After: the same invalid control omits both request `auto_parameters` and response `selectedParameters`.

## Upgrade applied

Changed direct Tavily response parsing to use the normalized `autoParameters` boolean for `selectedParameters` exposure.
