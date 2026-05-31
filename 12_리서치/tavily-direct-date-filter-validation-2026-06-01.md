# Tavily direct date filter validation

## Insight

The main research API validates exact date filters before Tavily is called, but direct `tavilySearch` calls previously only trimmed `startDate` and `endDate`. Invalid values such as `2026-99-01` or `not-a-date` could therefore reach the provider and create avoidable request failures.

## A/B verification

- Before: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "invalid direct Tavily exact date"` failed because the provider body contained `start_date: "2026-99-01"`.
- After: the same focused test passes and omits both invalid exact date filters before the provider fetch.

## Upgrade applied

Validate direct Tavily exact date filters with strict `YYYY-MM-DD` parsing plus calendar-date checks. Valid dates are preserved; invalid direct values are omitted from the provider request.
