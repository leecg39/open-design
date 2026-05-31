# Research report Windows-invalid character evidence

- Date: 2026-06-01
- Area: `apps/daemon/src/research/report.ts`
- Goal: reject explicit report paths that would fail on Windows because of reserved characters.

## Observation

After adding Windows absolute path and reserved file-name checks, explicit report paths can still contain characters Windows does not allow in path segments, such as `:` or `<`.

On POSIX these paths can resolve and write, but packaged Windows builds would fail later with less actionable filesystem errors.

## Expected improvement

`resolveResearchReportPath` should reject path segments containing Windows-reserved characters before any write attempt.

## Verification log

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts -t "Windows-invalid"` failed because `research/bad:name.md` was accepted.
- GREEN: the same focused test passed after path segment validation rejected Windows-reserved characters and control characters.
- Full scoped verification: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts` passed with 26 tests.
- Typecheck: `pnpm --filter @open-design/daemon typecheck` passed.
- Guard: `pnpm guard` still fails on the pre-existing residual JavaScript file `factolink-ir-deck/assets/runtime.js`; test layout, e2e layout, web test layout, and tools layout checks passed.
