# Tavily direct country topic boundary

## Insight

Tavily Search documents `country` as a country boost available only when `topic` is `general`. Open Design's product-level research path already enforces that boundary, but the lower-level direct helper could still send `country` together with `topic: "news"` or `topic: "finance"`.

Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B verification

- Before: the focused direct helper test failed because `topic: "news"` plus `country: "kr"` produced `country: "south korea"` in the provider body.
- After: direct helper requests keep `topic: "news"` but omit `country`; general/default searches still normalize and send valid country boosts.

## Upgrade applied

Moved direct country application behind normalized topic handling, so `country` is preserved only for default/general Tavily searches.
