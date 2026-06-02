# Research Raw Content Mode Control

Date: 2026-06-01

## Research question

Should OD expose Tavily's raw content format choice instead of only a boolean `includeRawContent` switch?

## Source evidence

- Tavily Search API documents `include_raw_content` as boolean or string. `markdown` or `true` returns markdown content, while `text` returns plain text and may increase latency: https://docs.tavily.com/documentation/api-reference/endpoint/search
- The same endpoint response exposes `raw_content` per result, which OD already stores as bounded `rawContent` evidence: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B result

- Before: OD supported `includeRawContent: true`, but API/web/contract callers could not explicitly request Tavily's `text` raw-content mode. `/search --raw-content-mode text` was treated as an unknown flag and the canonical query accidentally started with `text`.
- After: OD accepts `includeRawContent: "markdown" | "text"` in contracts and daemon API, emits executable `--raw-content-mode <mode>` command flags, and preserves the selected mode in web metadata and report metadata.

## Product impact

Evidence-heavy research can now choose markdown when structure matters or plain text when downstream quoting/excerpting should avoid markup noise. Existing `/search --raw` and `--include-raw-content` behavior remains the markdown-compatible default.

## Validation

- RED daemon API: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "bounded raw source content"` failed because `includeRawContent: "text"` was ignored.
- RED contract: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-contract.test.ts -t "raw content research flags"` failed because the command omitted `--raw-content-mode text`.
- RED web: `pnpm --filter @open-design/web exec vitest run -c vitest.config.ts tests/components/ChatComposer.search.test.tsx -t "raw content flags"` failed because `--raw-content-mode` was unknown.
- GREEN focused: all three RED commands passed after adding raw-content mode normalization and command rendering.
- GREEN broader daemon: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts` passed all 82 tests outside the sandbox.
- GREEN broader contract: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-contract.test.ts` passed all 15 tests.
- GREEN broader web: `pnpm --filter @open-design/web exec vitest run -c vitest.config.ts tests/components/ChatComposer.search.test.tsx` passed all 34 tests.
- GREEN typecheck: `pnpm --filter @open-design/daemon typecheck` and `pnpm --filter @open-design/web typecheck` passed.
- Repo guard: `pnpm guard` still fails on the pre-existing unrelated `factolink-ir-deck/assets/runtime.js`; all guard layout checks passed.
