# Research domain wildcard filters

## Insight

Tavily Search best-practices show domain filtering with a leading wildcard such as `*.com`. Open Design's domain normalization accepted ordinary domains and URLs, but rejected provider-supported wildcard domain filters.

Source: https://docs.tavily.com/documentation/best-practices/best-practices-search

## A/B verification

- Before: focused domain-filter tests failed because `*.com` was dropped from both direct Tavily and high-level research provider bodies.
- After: `*.com` is preserved alongside ordinary normalized domains, while invalid domain strings are still filtered out.

## Upgrade applied

Extended direct and high-level research domain validation to allow a single leading wildcard before either a TLD or a normal domain.
