# Research report Windows reserved path evidence

- Date: 2026-06-01
- Area: `apps/daemon/src/research/report.ts`
- Goal: prevent explicit report paths from using file names that fail on Windows.

## Observation

`defaultResearchReportPath` already avoids Windows reserved base names such as `CON` and `COM1` by prefixing generated slugs with `research-`.

Explicit report paths go through `resolveResearchReportPath`. Before this change, a path like `research/CON.md` could be accepted even though Windows treats `CON` as a reserved device name regardless of extension.

## Expected improvement

Explicit report paths should reject reserved Windows file base names before any write attempt, with a clear error message.

## Verification log

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts -t "Windows reserved"` failed because `research/CON.md` was accepted.
- GREEN: the same focused test passed after `resolveResearchReportPath` rejected reserved Windows file base names.
- Full scoped verification: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts` passed with 25 tests.
- Typecheck: `pnpm --filter @open-design/daemon typecheck` passed.
- Guard: `pnpm guard` still fails on the pre-existing residual JavaScript file `factolink-ir-deck/assets/runtime.js`; test layout, e2e layout, web test layout, and tools layout checks passed.
