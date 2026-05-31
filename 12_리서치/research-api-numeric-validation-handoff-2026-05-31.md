# Research API numeric validation handoff

Date: 2026-05-31

## Product gap

`searchResearch` can report invalid numeric controls such as `minScore: "high"` or
`maxSources: "many"`, but `/api/research/search` filtered those fields out unless
they were already JavaScript numbers. A bad client or agent request could
therefore look successful while silently dropping evidence-quality constraints.

## Evidence

- The daemon route accepted raw request JSON from local UI and CLI callers.
- The route passed only number-typed `minScore` and `maxSources` into
  `searchResearch`.
- The research layer already had warning copy for invalid numeric controls.
- Invalid `maxSources` also fell back to the shallow source cap, even when the
  request selected `depth: "deep"`.

## Upgrade decision

- Let raw API numeric control values reach the research validation layer.
- Widen the internal input type for these two fields to match the real JSON
  boundary.
- Keep invalid values out of provider requests while preserving explicit warning
  messages.
- Use the selected depth's default source cap when `maxSources` is invalid.

## A/B validation

- A: an API request with `depth: "deep"` and invalid numeric controls should
  return warning messages instead of silently omitting those controls.
- B: the same invalid `maxSources` request should still use the deep default
  `max_results: 20`, not the shallow fallback of 5.

## Non-goals

- Do not relax CLI parsing errors for invalid numeric flags.
- Do not change finite clamping behavior for out-of-range numeric values.
- Do not add a second validation system in the route.
