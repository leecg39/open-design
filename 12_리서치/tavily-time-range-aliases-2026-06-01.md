# Tavily time range aliases

## Insight

The current Tavily Search documentation accepts both long `time_range` values (`day`, `week`, `month`, `year`) and short aliases (`d`, `w`, `m`, `y`). Open Design only accepted the long values, so users following provider docs could pass `w` and silently lose the freshness filter in the web composer, command contract, or daemon request.

Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B verification

- Before: focused daemon, web composer, and command-contract tests failed because `w` was treated as invalid or omitted.
- After: `d/w/m/y` are normalized to `day/week/month/year`, warnings are avoided, and provider requests use the canonical long value.

## Upgrade applied

Added small alias maps in the web `/search` parser, daemon research input normalization, and agent command contract renderer. The public contract still stores canonical long values, keeping reports and metadata consistent.
