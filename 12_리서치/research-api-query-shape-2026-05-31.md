# Research API query shape validation

Date: 2026-05-31

## Product gap

The research query is required, but the API boundary can receive any JSON value.
`searchResearch` assumed `query` was a string and called `.trim()` directly. A
malformed request such as `query: 42` could therefore raise a TypeError and
surface as a generic 500 instead of the existing `QUERY_REQUIRED` 400.

## Evidence

- `/api/research/search` forwards `req.body?.query` from JSON.
- TypeScript marked `SearchResearchInput.query` as `string`, but runtime JSON
  does not enforce that.
- The required-query check only worked after a successful `.trim()` call.
- A bad request should not look like a daemon failure.

## Upgrade decision

- Treat `query` as an unknown runtime value at the research boundary.
- Normalize only string queries with `.trim()`.
- Preserve the existing `query required` / `QUERY_REQUIRED` error for missing,
  empty, or non-string query values.

## A/B validation

- A: malformed query JSON should return HTTP 400 with `QUERY_REQUIRED`.
- B: malformed query JSON should not reach provider configuration or Tavily
  fetch code.

## Non-goals

- Do not coerce numbers or objects into query strings.
- Do not change valid query truncation behavior.
- Do not change CLI parsing.
