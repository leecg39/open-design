# Research Auto Parameters Depth Control

Date: 2026-06-01

## Research question

Should OD omit `search_depth` when `/search --auto` is used at the default `shallow` depth, or should it still send `search_depth: "basic"` to Tavily?

## Source evidence

- Tavily's Search API says `auto_parameters` can automatically configure search parameters and may set `search_depth` to `advanced`, using 2 API credits per request. It also says callers can explicitly set `search_depth` to `basic` to avoid the extra cost: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Tavily best practices repeat that `auto_parameters` may set `search_depth` to `advanced` and recommend setting it manually to control cost: https://docs.tavily.com/documentation/best-practices/best-practices-search

## A/B result

- Before: `searchResearch({ autoParameters: true })` sent `auto_parameters: true` but omitted `search_depth`, even though OD's public prompt/metadata still represented the request as `depth: "shallow"`.
- After: the same request sends `auto_parameters: true` and `search_depth: "basic"`, so provider auto tuning can still choose supported parameters while OD's explicit shallow cost/latency contract remains enforced.

## Product impact

This makes `/search --auto` safer for routine product research. Users still get intent-aware provider tuning, but the default shallow path no longer leaves credit usage and latency open-ended.

## Validation

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "provider-selected parameters"` failed because the Tavily request omitted `search_depth`.
- GREEN focused: the same command passed after `searchResearch` always forwarded OD's normalized depth to Tavily.
- GREEN broader: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts` passed all 82 tests when rerun outside the sandbox; the sandbox run failed only on localhost `listen EPERM`.
- GREEN typecheck: `pnpm --filter @open-design/daemon typecheck` passed.
- Repo guard: `pnpm guard` still fails on the pre-existing unrelated `factolink-ir-deck/assets/runtime.js`; all guard layout checks passed.
