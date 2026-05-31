# Research CLI repeated domain flags

## Insight

Tavily Search accepts `include_domains` and `exclude_domains` as arrays. Open Design's `od research search` CLI documented comma-separated domains, but repeated flags are a natural CLI shape for array inputs:

```bash
od research search --query "..." --include-domains openai.com --include-domains docs.openai.com
```

Before this upgrade, the shared flag parser kept only the last string flag value, so earlier domain filters could be silently dropped before the daemon request.

Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B verification

- Before: the focused CLI test failed because repeated `--include-domains` values could not be collected before request serialization.
- After: repeated space-form and equals-form values are collected, comma-split, and preserved in order for research request serialization.

## Upgrade applied

Added research-specific repeated string flag collection instead of changing the shared parser globally. The CLI now uses this helper for `--include-domains` and `--exclude-domains`, preserving multiple array entries while keeping other subcommand flag behavior unchanged.
