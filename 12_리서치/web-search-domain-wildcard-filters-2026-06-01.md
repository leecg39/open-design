# Web Search Domain Wildcard Filters

Date: 2026-06-01

## Research question

Can the web `/search` composer safely preserve provider-supported wildcard domain filters such as `*.com` instead of dropping them before the daemon research command sees them?

## Source evidence

- Tavily Search API reference documents `include_domains` as a string array with a maximum of 300 domains and `exclude_domains` as a string array with a maximum of 150 domains: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Tavily Search best practices include a wildcard domain example: `include_domains: ["*.com"]` paired with `exclude_domains: ["example.com"]`: https://docs.tavily.com/documentation/best-practices/best-practices-search

## A/B result

- Before: `/search --include-domains "*.com,OpenAI.com,docs.openai.com" ...` normalized `openai.com` and `docs.openai.com`, but dropped `*.com` and emitted an invalid include-domain warning.
- After: the same composer input preserves `*.com`, lowercases normal domains, and passes `includeDomains: ["*.com", "openai.com", "docs.openai.com"]` into research metadata and the generated OD research command.

## Product impact

This keeps the UI command layer aligned with the provider capability and the daemon research contract. Users can now scope searches by broad TLD wildcard filters while still excluding noisy individual domains downstream.

## Validation

- RED: `pnpm --filter @open-design/web exec vitest run -c vitest.config.ts tests/components/ChatComposer.search.test.tsx -t "domain flags"` failed because `*.com` was omitted.
- GREEN focused: the same command passed after the composer domain regex accepted a single leading wildcard label.
- GREEN broader: `pnpm --filter @open-design/web exec vitest run -c vitest.config.ts tests/components/ChatComposer.search.test.tsx` passed all 34 tests.
- GREEN typecheck: `pnpm --filter @open-design/web typecheck` passed.
- Repo guard: `pnpm guard` still fails on the pre-existing unrelated `factolink-ir-deck/assets/runtime.js`; all guard layout checks passed.
