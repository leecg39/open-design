# Research provider diagnostics

Date: 2026-05-31

## Product gap

The research command currently returns content evidence but drops provider diagnostics. For a reusable research report, the agent and user should be able to see credit usage, provider request ID, and response time when the provider supplies them.

## Evidence

- Tavily Search can include `usage` when `include_usage` is requested.
- Tavily Search responses may include `request_id` for provider support/debugging.
- Tavily Search responses include `response_time`.
- Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## Upgrade decision

- Send `include_usage: true` in Tavily search requests.
- Add optional provider diagnostics to `ResearchFindings`: `usage`, `requestId`, and `responseTime`.
- Normalize values conservatively: finite non-negative credits, non-empty request ID, finite non-negative response time.

## A/B validation

- A: before the change, provider usage and request identifiers are ignored.
- B: after the change, returned diagnostics are available in the JSON findings and can be included in reports.

## Non-goals

- Do not expose API keys or request headers.
- Do not make provider diagnostics required; not every provider or response needs to supply them.
