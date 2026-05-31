# Research enum filter warnings

Date: 2026-05-31

## Product gap

Research already reports warnings for ignored dates, domains, and numeric controls. Enum-like controls still have silent fallback paths: invalid `depth`, `topic`, `timeRange`, or `country` values can be dropped or defaulted without telling the user.

## Evidence

- `depth` defaults to shallow when the value is not `medium` or `deep`.
- `topic` is omitted unless it is `general`, `news`, or `finance`.
- `timeRange` is omitted unless it is `day`, `week`, `month`, or `year`.
- `country` only applies to general searches and is intentionally dropped for news/finance.

## Upgrade decision

- Add warnings for invalid depth/topic/timeRange values.
- Add warnings for invalid country boosts.
- Add warnings when country is ignored because topic is news or finance.
- Keep existing fallback behavior; this is an observability improvement, not a breaking validation change.

## A/B validation

- A: valid enum controls should produce no new warnings.
- B: invalid or incompatible controls should be omitted from the provider request and surfaced in `warnings`.

## Non-goals

- Do not reject invalid enum values.
- Do not apply country boost to news or finance searches.
- Do not change default depth semantics.
