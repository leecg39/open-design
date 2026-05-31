# Research temporal filter priority

Date: 2026-05-31

## Product gap

Research supports both recency filters (`timeRange`) and exact date filters (`startDate`, `endDate`). When both are present, the request is ambiguous: the user may expect the exact range to win, while the provider receives two temporal constraints.

## Evidence

- `timeRange` describes relative freshness such as day, week, month, or year.
- `startDate` and `endDate` describe exact calendar bounds.
- The research response already carries warnings for ignored or adjusted filters.

## Upgrade decision

- Treat exact date filters as stronger than relative recency.
- If `startDate` or `endDate` is valid, omit `timeRange`.
- Add a warning explaining that `timeRange` was ignored because exact date filters were provided.

## A/B validation

- A: timeRange alone should still be forwarded.
- B: timeRange plus exact dates should forward only exact dates and return a warning.

## Non-goals

- Do not reject the request.
- Do not alter exact date validation.
- Do not infer missing start or end dates.
