# Research quoted date filters

## Insight

Tavily Search requires `start_date` and `end_date` in `YYYY-MM-DD` format. Open Design already strips wrapping quotes for country, time range, and domains, but exact date filters were stricter and dropped copied values such as `"2026-05-01"`.

Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B verification

- Before: focused tests failed because quoted direct dates were omitted from the Tavily body, and quoted core research dates were not preserved in findings metadata.
- After: matching single or double wrapping quotes are stripped before date validation, then the normalized `YYYY-MM-DD` values are forwarded.

## Upgrade applied

Reused the existing quote-stripping normalization in both direct Tavily date parsing and high-level research date parsing.
