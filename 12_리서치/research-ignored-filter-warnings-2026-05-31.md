# Research ignored filter warnings

Date: 2026-05-31

## Product gap

The research API sanitizes dates and domains before calling Tavily. That protects the provider request, but invalid or duplicate filters can be silently ignored. A user or agent may think a date or domain constraint shaped the research when it did not.

## Evidence

- `startDate` and `endDate` are currently omitted when they do not match a valid `YYYY-MM-DD` calendar date.
- Domain filters are normalized and deduped before being sent to Tavily.
- The research result already returns applied filters, but it does not explain dropped filters.
- Reports are supposed to cite reliable evidence; hidden filter loss weakens that trust.

## Upgrade decision

- Add optional `warnings` to research findings.
- Warn when invalid exact date filters are ignored.
- Warn when domain filters are invalid, duplicate, or exceed the supported cap.
- Keep valid normalized filters unchanged.
- Instruct report generation to mention warnings so the user sees constraint loss.

## A/B validation

- A: valid filters should produce no warnings.
- B: invalid dates/domains should be excluded from the provider request and surfaced as warnings.

## Non-goals

- Do not fail all invalid filters; partial valid filters should still run.
- Do not expose raw rejected values in case they contain sensitive input.
- Do not alter the reversed date-range hard error.
