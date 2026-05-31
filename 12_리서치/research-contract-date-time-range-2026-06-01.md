# Research contract exact-date timeRange evidence

- Date: 2026-06-01
- Area: `apps/daemon/src/prompts/research-contract.ts`
- Goal: prevent the generated research command contract from asking agents to pass redundant temporal filters.

## Observation

`searchResearch` already prefers exact date filters over relative time ranges. When `timeRange` is present with `startDate` or `endDate`, it drops `timeRange` and returns the warning `Ignored timeRange because exact date filters were provided.`

The command contract currently can generate examples that include both `--time-range week` and `--start-date` / `--end-date`. That means an otherwise correct `/search` run can produce an avoidable warning purely because the prompt contract asked for incompatible filters.

## Expected improvement

When exact date filters are valid, the contract should omit `--time-range` from shell examples. This keeps the prompt contract aligned with daemon behavior and reduces noisy report warnings.

## Verification log

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-contract.test.ts -t "relative time range"` failed because command examples still contained `--time-range week --start-date 2026-05-01 --end-date 2026-05-31`.
- GREEN: the same focused test passed after contract generation omitted `timeRange` whenever valid exact date filters exist.
- Full scoped verification: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-contract.test.ts` passed with 9 tests.
- Typecheck: `pnpm --filter @open-design/daemon typecheck` passed.
- Guard: `pnpm guard` still fails on the pre-existing residual JavaScript file `factolink-ir-deck/assets/runtime.js`; test layout, e2e layout, web test layout, and tools layout checks passed.
