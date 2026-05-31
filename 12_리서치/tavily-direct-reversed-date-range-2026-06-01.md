# Tavily direct reversed date range

## Insight

After direct exact-date validation, a remaining edge case was a valid but reversed range such as `startDate: 2026-05-31` and `endDate: 2026-05-01`. The main research API rejects that before Tavily is called, but direct `tavilySearch` previously still attempted a provider fetch, which could surface as a low-signal downstream failure.

## A/B verification

- Before: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "reversed direct Tavily exact date"` failed because the helper reached `fetch` and produced a `TypeError`.
- After: the same focused test passes, throws `TavilyError`, and proves `fetch` was not called.

## Upgrade applied

Reject direct Tavily exact date ranges when both dates are valid but `startDate` is later than `endDate`, matching the core research API's pre-provider validation boundary.
