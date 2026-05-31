# Tavily direct enum filter normalization

## Insight

Open Design's high-level research API normalizes `topic` and `timeRange`, but the direct Tavily helper still trusted TypeScript-only enum types at runtime. If an internal caller passed an unsupported topic like `blogs`, it could be forwarded to Tavily. Short provider-documented time range aliases such as `w` were also not canonicalized in the direct helper.

Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B verification

- Before: the focused direct Tavily test failed because `topic: "blogs"` reached the provider body and `timeRange: "w"` stayed as `w`.
- After: unsupported direct topics are omitted and time range aliases are normalized to canonical values before the fetch body is built.

## Upgrade applied

Added direct-helper runtime normalization for Tavily `topic` and `time_range`, matching the stricter web and daemon research paths.
