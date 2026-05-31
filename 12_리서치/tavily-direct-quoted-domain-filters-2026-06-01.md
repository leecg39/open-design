# Tavily direct quoted domain filters

## Insight

The core research API and web composer now accept quoted domain filters, but the lower-level `tavilySearch` helper can still be called directly by tests, scripts, or future internal code. When those callers pass a copied CLI-style value such as `"OpenAI.com"` or `'https://News.Example.com/story'`, Tavily domain normalization previously treated the quote characters as part of the domain and silently dropped the valid filter.

## A/B verification

- Before: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research.test.ts -t "cleans direct Tavily domain filters"` failed because `"OpenAI.com"` was omitted from `include_domains`.
- After: the same focused test passes and preserves `openai.com` plus the quoted URL host `news.example.com`.

## Upgrade applied

Strip one matching pair of wrapping single or double quotes before direct Tavily domain normalization. The existing URL parsing, duplicate removal, overlap removal, and provider limit behavior remain unchanged.
