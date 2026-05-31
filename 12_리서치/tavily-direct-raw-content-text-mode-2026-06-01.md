# Tavily direct raw content text mode

## Insight

Tavily Search supports `include_raw_content` as `markdown`, `text`, `true`, or `false`. Open Design's high-level research path intentionally uses markdown for evidence-heavy reports, but the direct Tavily helper could not express the provider's `text` mode.

Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B verification

- Before: the focused direct Tavily test failed because `includeRawContent: "text"` produced `include_raw_content: false`.
- After: direct helper calls can request `text`, while `true` and `markdown` continue to map to markdown and invalid string booleans remain disabled.

## Upgrade applied

Extended the direct helper raw-content control to normalize provider-supported `markdown` and `text` modes before request construction and response parsing.
