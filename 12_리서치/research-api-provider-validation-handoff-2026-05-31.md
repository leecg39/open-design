# Research API provider validation handoff

Date: 2026-05-31

## Product gap

`/api/research/search` silently dropped malformed `providers` values before
calling the research layer. A request such as `providers: "bing"` could look like
it selected a provider, but the daemon would default to Tavily with no warning in
the returned findings.

## Evidence

- The route only forwarded `providers` when the request body value was already
  an array.
- The research layer then defaulted an absent provider list to `tavily`.
- This hid client/agent mistakes at the exact boundary where the report should
  explain ignored controls.
- Provider ids from JSON are user-facing enough that casing and whitespace
  should be normalized before support checks.

## Upgrade decision

- Forward raw provider control values from the route into `searchResearch`.
- Validate provider list shape inside the research layer.
- Warn when a provider control has the wrong JSON shape.
- Normalize valid provider ids by trimming and lowercasing before support checks.

## A/B validation

- A: malformed `providers: "bing"` should return a warning instead of silently
  disappearing.
- B: the request should still complete with the explicit fallback provider
  `tavily`, and Tavily should be called exactly once.

## Non-goals

- Do not add additional provider implementations.
- Do not accept comma-separated provider strings as a supported API shape.
- Do not change the existing unsupported-provider error for valid array entries
  such as `["bing"]`.
