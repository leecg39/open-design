# Research report Windows trailing segment evidence

- Date: 2026-06-01
- Area: `apps/daemon/src/research/report.ts`
- Goal: reject explicit report path segments that Windows cannot persist reliably.

## Observation

Windows does not allow path segments that end with a dot or space. POSIX can resolve paths such as `research./report.md` or `research/report.`, so validation based only on the current host can allow report paths that later fail for Windows users.

## Expected improvement

`resolveResearchReportPath` should reject any non-special path segment ending with a dot or space before the write attempt.

## Verification log

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts -t "trailing dots"` failed because `research./report.md` was accepted.
- GREEN: the same focused test passed after path segment validation rejected segments ending in a dot or space.
- Full scoped verification: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts` passed with 27 tests.
- Typecheck: `pnpm --filter @open-design/daemon typecheck` passed.
- Guard: `pnpm guard` still fails on the pre-existing residual JavaScript file `factolink-ir-deck/assets/runtime.js`; test layout, e2e layout, web test layout, and tools layout checks passed.
