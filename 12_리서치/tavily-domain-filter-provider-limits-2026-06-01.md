# Tavily domain filter provider limits

## Insight

Open Design was capping both include and exclude domain filters at 20. The current official Tavily Search API documentation lists `include_domains` as maximum 300 domains and `exclude_domains` as maximum 150 domains. The old cap could silently narrow broad source-mapping research and remove valid user constraints before the provider request.

Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B verification

- Before: focused daemon, web composer, and prompt-contract tests failed because domain lists were truncated at 20.
- After: focused tests pass with direct/core include filters capped at 300, exclude filters capped at 150, and web/prompt flows preserving at least 25 domains without excess warnings.

## Upgrade applied

Split the previous single 20-domain cap into documented provider limits:

- Include domains: 300
- Exclude domains: 150

The change is applied consistently across the core research API, direct Tavily helper, web `/search` parser, and research command contract prompt.
