# Research provider diagnostics reporting

Date: 2026-05-31

## Product gap

Research JSON can include provider diagnostics such as `usage`, `requestId`, and
`responseTime`, but the report-writing prompt does not ask the agent to preserve
them. That means cost and traceability details may disappear even when the
provider returned them.

## Evidence

- The Tavily adapter requests usage and normalizes `usage`, `requestId`, and
  `responseTime`.
- `ResearchFindings` exposes these fields for downstream consumers.
- The reusable Markdown report requirements mention fetched time and citations,
  but not provider diagnostics.

## Upgrade decision

- Add a report instruction to include provider diagnostics when present.
- Apply it to both the daemon command contract and the web `/search` prompt.
- Keep diagnostics optional because not every provider response includes them.

## A/B validation

- A: existing research prompt should continue requiring warnings and citation
  handling.
- B: upgraded prompt should additionally mention `usage`, `requestId`, and
  `responseTime` so reports can preserve provider cost and traceability.

## Non-goals

- Do not change the JSON shape.
- Do not require diagnostics in every report.
- Do not expose secrets or request headers.
