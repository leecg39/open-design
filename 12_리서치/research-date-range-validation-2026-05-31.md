# Research date range validation

Date: 2026-05-31

## Product gap

Research supports exact `startDate` and `endDate` filters, but format validation alone is not enough. A reversed range such as `2026-05-31` to `2026-05-01` is structurally valid yet semantically impossible. Sending it to the provider can waste a request and produce confusing failures or empty evidence.

## Evidence

- The current daemon validates each date independently.
- Tavily Search accepts `start_date` and `end_date` filters, so the local contract should reject impossible ranges before network I/O.
- Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## Upgrade decision

Reject date ranges where `startDate` is later than `endDate` with a local `ResearchError` before Tavily is called.

## A/B validation

- A: valid ordered dates should still reach Tavily.
- B: reversed dates should return `INVALID_DATE_RANGE` locally and never call fetch.

## Non-goals

- Do not infer dates from natural language.
- Do not change the allowed YYYY-MM-DD format.
