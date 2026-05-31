# Web search quoted tokenization

## Insight

The `/search` composer accepted `--country "South Korea"` but failed on the equally common shell-style form `--country="South Korea"`. The previous whitespace-only tokenizer split the quoted value into `--country="South` and `Korea"`, which dropped the country boost and polluted the canonical query.

## A/B verification

- Before: `pnpm --filter @open-design/web exec vitest run -c vitest.config.ts tests/components/ChatComposer.search.test.tsx -t "equals-style multi-word"` failed because the prompt warned about an invalid country and searched for `Korea" AI design market`.
- After: the same focused test passes, emits `--country south-korea`, and keeps the canonical query as `AI design market`.

## Upgrade applied

The web `/search` parser now tokenizes arguments with quote awareness while preserving quote characters in query text. This fixes quoted flag values without removing deliberate exact-phrase quotes from the user's search query.
