# Research domain filter controls

Date: 2026-05-31

## Why this matters

Depth and freshness improve breadth and timing, but source quality still depends on where search is allowed to look. For product and market research, users often need official docs, vendor blogs, finance pages, analyst sites, or to remove noisy domains from the result set.

## Current state

- `/search` can control depth, topic, relative freshness, and exact date range.
- The daemon still lets Tavily choose all domains, so a query can mix primary sources, reposts, forums, SEO pages, and commentary.

## External evidence

- Tavily Search API supports `include_domains`, a list of domains to include in results, with a documented maximum of 300 domains. Source: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Tavily Search API supports `exclude_domains`, a list of domains to exclude, with a documented maximum of 150 domains. Source: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Tavily's Web Search Essentials guide recommends domain-constrained search to restrict results to trusted sources or remove noise, and notes that domain lists should stay short for best results. Source: https://docs.tavily.com/examples/quick-tutorials/search-api

## Upgrade decision

Add domain filters as optional, explicit controls:

- API and contracts accept `includeDomains` and `excludeDomains`.
- Daemon normalizes domain strings and forwards valid lists to Tavily as `include_domains` and `exclude_domains`.
- CLI accepts comma-separated `--include-domains` and `--exclude-domains`.
- `/search` accepts the same flags and includes them in the agent command contract.
- Local normalization caps each list to 20 domains to keep generated searches focused.

## A/B test plan

- A: Current code cannot constrain domains; users must add "site:"-like text to the query, which is provider-dependent and not visible in structured metadata.
- B: After the change, caller metadata preserves domain filters, prompts show exact flags, and Tavily request bodies include `include_domains` and `exclude_domains` only after normalization.

## Non-goals

- No UI picker or saved trusted-source library yet.
- No automatic source trust scoring.
- No broad domain taxonomy.
- No default blocklist; users stay in control.
