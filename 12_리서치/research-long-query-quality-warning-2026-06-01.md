# Research long query quality warning

## Insight

Tavily's Search best practices recommend keeping search queries under 400 characters and splitting complex, multi-topic prompts into focused sub-queries. Open Design already bounded provider queries at 1000 characters, but it did not surface the quality recommendation before the hard truncation point.

Source: https://docs.tavily.com/documentation/best-practices/best-practices-search

## A/B verification

- Before: the focused long-query test only warned when the query hit the 1000-character hard truncation.
- After: the same findings also include a provider-quality warning that suggests splitting complex research into sub-queries.

## Upgrade applied

Added a 400-character best-practice warning for effective research queries while preserving the existing 1000-character safety bound.
