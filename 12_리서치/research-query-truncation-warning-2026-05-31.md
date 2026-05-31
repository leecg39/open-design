# Research query truncation warning

Date: 2026-05-31

## Product gap

The research daemon caps search queries at 1000 characters before calling the
provider, but it does not tell the agent or user when truncation happened. A
reusable report can therefore look like it researched the full user prompt when
the provider actually received a shortened query.

## Evidence

- `searchResearch` trims the input query and slices it to 1000 characters.
- Research reports are instructed to include the query and warnings.
- Other sanitized controls already surface warnings when they are ignored,
  clamped, or changed.

## Upgrade decision

- Name the query cap as `RESEARCH_QUERY_LIMIT`.
- Preserve the existing 1000-character safety cap.
- Add `Truncated query to 1000 characters.` to findings warnings when the
  trimmed input exceeds the cap.
- Keep the provider request and returned `query` aligned to the effective query.

## A/B validation

- A: normal queries should not add a warning.
- B: over-limit queries should send the truncated query and include a warning
  so the final report can disclose the effective query.

## Non-goals

- Do not change the query limit.
- Do not reject long queries.
- Do not summarize or rewrite the user's query.
