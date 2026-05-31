# Research filtered source count

Date: 2026-05-31

## Product gap

`minScore` can remove low-relevance sources after the provider returns results. If at least one source remains, the search succeeds, but the response does not say how many provider results were filtered out. This hides how selective the research result is.

## Evidence

- `minScore` is a local relevance filter applied after Tavily returns sources.
- The API now has a specific empty-state message when all provider results are filtered.
- Partial filtering should also be visible so reports can explain evidence selectivity.

## Upgrade decision

- Add optional `filteredSourceCount` to research findings.
- Set it only when `minScore` removes one or more provider sources and at least one source remains.
- Update report instructions so agents mention relevance filtering when present.

## A/B validation

- A: searches without `minScore` should not include `filteredSourceCount`.
- B: searches where `minScore` removes some results should return the excluded count.

## Non-goals

- Do not return filtered-out sources.
- Do not change filtering thresholds.
- Do not treat partial filtering as a warning.
