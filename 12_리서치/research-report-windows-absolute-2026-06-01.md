# Research report Windows absolute path evidence

- Date: 2026-06-01
- Area: `apps/daemon/src/research/report.ts`
- Goal: keep explicit report paths project-relative across POSIX and Windows path syntaxes.

## Observation

`resolveResearchReportPath` replaces backslashes with forward slashes and uses `path.isAbsolute` to reject absolute paths. On POSIX, a Windows-style path such as `C:\temp\report.md` becomes `C:/temp/report.md`, which `path.isAbsolute` does not treat as absolute.

That can make validation behavior depend on the host OS and can place a user-supplied Windows absolute path under the project as a strange relative path.

## Expected improvement

Report path validation should reject Windows absolute paths as project-relative violations regardless of the host OS.

## Verification log

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts -t "keeps explicit report paths"` failed because `C:\temp\report.md` was accepted on POSIX.
- GREEN: the same focused test passed after validation also checked `path.win32.isAbsolute`.
- Full scoped verification: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts` passed with 25 tests.
- Typecheck: `pnpm --filter @open-design/daemon typecheck` passed.
- Guard: `pnpm guard` still fails on the pre-existing residual JavaScript file `factolink-ir-deck/assets/runtime.js`; test layout, e2e layout, web test layout, and tools layout checks passed.
