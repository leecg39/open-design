# Research discarded source count

Date: 2026-05-31

## Product gap

The Tavily adapter now normalizes source URLs and drops duplicate or non-web URLs before returning citations. That improves citation quality, but it also hides how many provider results were discarded. A report can look thinner than the provider response without explaining why.

## Evidence

- Source URLs are the citation surface for generated research reports.
- The adapter accepts only HTTP(S) source URLs and dedupes normalized URLs.
- Dropping unusable or duplicate source URLs is correct, but the result should expose the loss of provider evidence.

## Upgrade decision

- Track provider results discarded by source URL normalization or deduplication.
- Return `discardedSourceCount` when at least one provider result is dropped and at least one source remains.
- If every provider result is dropped, return a clearer `NO_RESEARCH_SOURCES` error message.
- Tell report generation to mention discarded sources when present.

## A/B validation

- A: all-valid provider results should not include `discardedSourceCount`.
- B: mixed valid and invalid/duplicate results should include `discardedSourceCount`.
- C: all discarded results should fail with a URL-quality-specific empty state.

## Non-goals

- Do not return discarded source details.
- Do not relax the HTTP(S) citation requirement.
- Do not change source ordering for retained results.
