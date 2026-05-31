# Research API domain filter shape validation

Date: 2026-05-31

## Product gap

Domain filters are evidence-quality controls. Arrays and comma-separated strings
are normalized, but malformed JSON shapes such as objects or numbers were
treated as empty input with no warning. A client could believe domain scoping was
applied while the provider request actually searched the open web.

## Evidence

- `normalizeResearchDomains` accepts arrays and comma-separated strings.
- `countResearchDomainInputs` returned 0 for objects, numbers, and booleans.
- The warning path only compared counted input length against normalized output
  length, so wrong JSON shapes never produced a warning.
- The `/api/research/search` route forwards raw domain fields, so daemon-layer
  validation is the right place to report this.

## Upgrade decision

- Treat only `null`, `undefined`, arrays, and strings as valid domain input
  shapes.
- Warn separately for invalid `includeDomains` and `excludeDomains` shapes.
- Preserve the existing warning for invalid, duplicate, or excess entries inside
  otherwise valid shapes.

## A/B validation

- A: malformed `includeDomains` and `excludeDomains` should be visible in
  returned warnings.
- B: malformed domain filters should not leak into Tavily `include_domains` or
  `exclude_domains` provider payload fields.

## Non-goals

- Do not remove comma-separated string support.
- Do not change URL-to-hostname normalization.
- Do not reject the entire search request for malformed optional filters.
