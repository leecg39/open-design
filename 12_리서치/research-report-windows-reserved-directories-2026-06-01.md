# Research report Windows reserved directory evidence

- Date: 2026-06-01
- Area: `apps/daemon/src/research/report.ts`
- Goal: reject explicit report paths with Windows reserved names in directory segments.

## Observation

The report path validation now rejects Windows reserved names for the final file segment, but Windows device names are invalid as path segments generally. A path like `CON/report.md` or `research/LPT1/report.md` can still be accepted before write time.

## Expected improvement

`resolveResearchReportPath` should reject reserved Windows base names in directory segments as well as the final file segment.

## Verification log

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts -t "reserved directory"` failed because `CON/report.md` was accepted.
- GREEN: the same focused test passed after directory segments were checked for Windows reserved base names.
- Full scoped verification: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts` passed with 28 tests.
- Typecheck: `pnpm --filter @open-design/daemon typecheck` passed.
- Guard: `pnpm guard` still fails on the pre-existing residual JavaScript file `factolink-ir-deck/assets/runtime.js`; test layout, e2e layout, web test layout, and tools layout checks passed.
