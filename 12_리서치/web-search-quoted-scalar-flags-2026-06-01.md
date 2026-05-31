# Web search quoted scalar flags

## Insight

After making `/search` tokenization quote-aware, scalar flag values still kept their wrapping quotes. Inputs such as `--depth="deep"`, `--start-date="2026-05-01"`, or `--max-sources="15"` were parsed as invalid even though they are common shell-style values.

## A/B verification

- Before: `pnpm --filter @open-design/web exec vitest run -c vitest.config.ts tests/components/ChatComposer.search.test.tsx -t "quoted scalar"` failed with parser warnings for depth, topic, date, min-score, and max-sources.
- After: the same focused test passes and emits the expected deep news search command with exact dates, minimum score, and source cap.

## Upgrade applied

The web `/search` parser now strips one matching pair of wrapping quotes from scalar flag values before validating enums, dates, and numeric controls. Query text still preserves deliberate quotes.
