# Research contract report reuse evidence

- Date: 2026-06-01
- Area: `apps/daemon/src/prompts/research-contract.ts`
- Goal: avoid duplicate report creation instructions after successful `/search` runs.

## Observation

The contract command always includes `--save-report`, and CLI save handling writes a Markdown report when `--save-report` or `--report` is present. It then adds `reportPath` to the single stdout JSON object.

The query-specific contract text currently says to create the Markdown report after command JSON or fallback search results. On the successful OD command path, that can be read as a duplicate-report instruction because the command already wrote the report.

## Expected improvement

The contract should split the two paths:

- successful OD command: use the returned `reportPath` and avoid creating a second report.
- fallback search: create a Markdown report in Design Files, then summarize with citations.

## Verification log

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-contract.test.ts -t "duplicate report"` failed because the prompt did not distinguish successful OD command JSON from fallback search results.
- GREEN: the same focused test passed after the contract said to reuse returned `reportPath` on success and only create a Markdown report for fallback search.
- Full scoped verification: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-contract.test.ts` passed with 10 tests.
- Typecheck: `pnpm --filter @open-design/daemon typecheck` passed.
- Guard: `pnpm guard` still fails on the pre-existing residual JavaScript file `factolink-ir-deck/assets/runtime.js`; test layout, e2e layout, web test layout, and tools layout checks passed.
