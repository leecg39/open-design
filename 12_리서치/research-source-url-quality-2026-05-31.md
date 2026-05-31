# Research source URL quality

Date: 2026-05-31

## Product gap

Research reports depend on clean citations. The current Tavily adapter accepts any non-empty result URL and does not dedupe repeated source URLs. If the provider returns duplicate entries, fragment-only variants, or non-HTTP links, the agent can overcount evidence or cite links that are not useful in a browser.

## Evidence

- The research result contract treats `sources[].url` as a citation URL for reports.
- Tavily Search results are web search results, so HTTP(S) URLs are the useful citation surface.
- The existing adapter already normalizes image URLs to HTTP(S), but source URLs do not get the same quality gate.
- The existing adapter dedupes images, but not sources.

## Upgrade decision

- Normalize source URLs through the URL parser.
- Accept only `http:` and `https:` source URLs.
- Drop URL fragments before deduplication so repeated anchor variants do not become separate citations.
- Keep query strings intact because they can identify distinct pages.

## A/B validation

- A: provider response with duplicate and invalid URLs should not produce duplicate or non-web citations.
- B: valid HTTP(S) sources should remain in order with normalized URLs.

## Non-goals

- Do not remove query strings.
- Do not rank or rewrite domains.
- Do not perform network validation for each URL.
