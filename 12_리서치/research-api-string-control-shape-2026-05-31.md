# Research API string control shape validation

Date: 2026-05-31

## Product gap

Research filters such as `depth`, `topic`, `country`, `timeRange`,
`startDate`, and `endDate` are string controls. Invalid strings were already
reported, but non-string JSON values such as numbers, booleans, arrays, or
objects were silently ignored and replaced by defaults.

## Evidence

- The daemon route forwards raw JSON filter values into `searchResearch`.
- Existing warnings used `hasNonEmptyString`, which excludes every non-string
  malformed value.
- Invalid non-string `depth` defaulted to `shallow` with no warning.
- Invalid non-string temporal filters disappeared from the provider payload with
  no returned diagnostic.

## Upgrade decision

- Widen string-like research input controls to unknown at the runtime boundary.
- Warn when a provided control is non-string.
- Preserve existing invalid-string warning copy and default/fallback behavior.
- Keep malformed filters out of the Tavily provider request.

## A/B validation

- A: malformed non-string controls should appear in returned warnings.
- B: malformed topic/country/time/date controls should not be serialized into
  the provider payload.

## Non-goals

- Do not coerce numbers or objects into strings.
- Do not reject the entire search request for malformed optional filters.
- Do not change valid enum/date behavior.
