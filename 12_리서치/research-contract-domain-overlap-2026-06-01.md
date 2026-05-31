# Research contract domain overlap evidence

- Date: 2026-06-01
- Area: `apps/daemon/src/prompts/research-contract.ts`
- Goal: keep command examples from passing domain filters that the daemon will immediately rewrite.

## Observation

`searchResearch` normalizes `includeDomains` and `excludeDomains`. When a domain appears in both lists, the daemon removes it from `excludeDomains` and returns the warning `Removed excludeDomains entries that also appear in includeDomains.`

The command contract can currently render the same domain in both `--include-domains` and `--exclude-domains`. That makes generated `/search` commands noisier than necessary and can produce avoidable report warnings.

## Expected improvement

The contract should remove any exclude-domain entries that already appear in the normalized include-domain list before building shell examples.

## Verification log

- RED: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-contract.test.ts -t "excluded domains"` failed because the command examples still rendered `--exclude-domains example.com,other.example.com` while `example.com` was also included.
- GREEN: the same focused test passed after contract generation removed exclude-domain entries already present in the normalized include-domain list.
- Full scoped verification: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-contract.test.ts` passed with 11 tests.
- Typecheck: `pnpm --filter @open-design/daemon typecheck` passed.
- Guard: `pnpm guard` still fails on the pre-existing residual JavaScript file `factolink-ir-deck/assets/runtime.js`; test layout, e2e layout, web test layout, and tools layout checks passed.
