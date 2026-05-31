# Tavily direct country normalization

## Insight

The main research API already normalizes country boosts such as `"South Korea"` and `kr`, but direct `tavilySearch` calls previously forwarded the raw string to Tavily. A direct caller passing a copied command value like `"KR"` would send the quote characters and uppercase alias to the provider instead of the expected Tavily country value.

## A/B verification

- Before: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "normalizes direct Tavily country"` failed because the provider body contained `"KR"`.
- After: the same focused test passes and sends `south korea`.

## Upgrade applied

Normalize direct Tavily country boosts by stripping one matching pair of wrapping quotes, lowercasing, expanding common aliases, compacting separators, and omitting invalid punctuation-only values before the provider request is built.
