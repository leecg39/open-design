# Research source favicon identity

Date: 2026-05-31

## Product gap

Research findings currently return title, URL, snippet, score, and publish date, but no source identity metadata beyond the URL. For agents writing reusable reports, favicons help distinguish publication/source identity quickly, especially when multiple sources have similar titles or syndicated content.

## Evidence

- Tavily Search supports `include_favicon`.
- When enabled, Tavily returns a `favicon` URL for each result.
- Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## Upgrade decision

- Request `include_favicon: true` for Tavily searches.
- Add optional `favicon?: string` to `ResearchSource`.
- Normalize favicon URLs to http/https only before returning them.

## A/B validation

- A: before the change, a Tavily result favicon is ignored and cannot appear in report data.
- B: after the change, the request asks for favicons and the normalized favicon is available on the returned source.

## Non-goals

- Do not download, cache, proxy, or render favicons.
- Do not require favicons to exist.
