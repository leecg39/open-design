# Research contract copied filter normalization

## Insight

The research command contract is the handoff from UI/API options to the agent-run `od research search` command. Core research and direct Tavily calls now normalize copied filter values such as quoted dates, quoted enum controls, and wildcard domains, but the command contract still rendered defaults or omitted those filters.

Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B verification

- Before: the focused contract test failed because `depth: "\"Deep\""`, `topic: "'News'"`, quoted dates, and `*.com` rendered as the default shallow command without topic, dates, or domains.
- After: the contract command renders `--depth deep --topic news --start-date 2026-05-01 --end-date 2026-05-31 --include-domains *.com,docs.example.com`.

## Upgrade applied

Aligned command-contract normalization with the research runtime by stripping wrapping quotes, lowercasing enum controls, validating quoted dates, and preserving provider-supported wildcard domain filters.
