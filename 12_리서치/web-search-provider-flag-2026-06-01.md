# Web search provider flag evidence

- Date: 2026-06-01
- Area: `apps/web/src/components/ChatComposer.tsx`
- Goal: avoid query pollution when users pass unsupported `/search --provider` flags.

## Observation

Research DTOs mention provider preference, but Phase 1 supports Tavily. The web `/search` parser only treats unknown flags generically. For `--provider=tavily`, the value stays attached to the flag and does not enter the query. For `--provider tavily`, the parser can warn on `--provider` and then treat `tavily` as part of the query.

## Expected improvement

The web parser should recognize `--provider` / `--provider=<value>` as unsupported, consume any separate provider value, and emit a clear warning without adding the provider name to the search query.

## Verification log

- RED: `pnpm --filter @open-design/web exec vitest run -c vitest.config.ts tests/components/ChatComposer.search.test.tsx -t "provider"` failed because `--provider=tavily` produced a generic unknown warning and `--provider tavily` put `tavily` in the canonical query.
- GREEN: the same focused test passed after the parser recognized `--provider` / `--provider=<value>` as unsupported, consumed any separate value, and emitted a provider-specific warning.
- Full scoped verification: `pnpm --filter @open-design/web exec vitest run -c vitest.config.ts tests/components/ChatComposer.search.test.tsx` passed with 29 tests.
- Typecheck: `pnpm --filter @open-design/web typecheck` passed.
- Guard: `pnpm guard` still fails on the pre-existing residual JavaScript file `factolink-ir-deck/assets/runtime.js`; test layout, e2e layout, web test layout, and tools layout checks passed.
