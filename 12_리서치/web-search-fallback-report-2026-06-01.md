# Web search fallback report evidence

- Date: 2026-06-01
- Area: `apps/web/src/components/ChatComposer.tsx`
- Goal: keep the web `/search` prompt aligned with the daemon research contract.

## Observation

The daemon research command contract now distinguishes successful OD command output from fallback search: success should reuse returned `reportPath`, while fallback search should create a Markdown report in Design Files before summarizing.

The web `ChatComposer` has a separate `/search` prompt builder. It tells the agent to use fallback search when OD research is unavailable, but it does not explicitly require creating a Markdown report for fallback results.

## Expected improvement

The web `/search` prompt should include the same fallback report instruction so `/search` runs preserve a reusable evidence artifact even when Tavily/OD command fallback is needed.

## Verification log

- RED: `pnpm --filter @open-design/web exec vitest run -c vitest.config.ts tests/components/ChatComposer.search.test.tsx -t "expands /search"` failed because the generated prompt did not include fallback Markdown report creation guidance.
- GREEN: the same focused test passed after `ChatComposer` added the fallback report instruction and clarified the successful OD command path.
- Full scoped verification: `pnpm --filter @open-design/web exec vitest run -c vitest.config.ts tests/components/ChatComposer.search.test.tsx` passed with 28 tests.
- Typecheck: `pnpm --filter @open-design/web typecheck` passed.
- Guard: `pnpm guard` still fails on the pre-existing residual JavaScript file `factolink-ir-deck/assets/runtime.js`; test layout, e2e layout, web test layout, and tools layout checks passed.
