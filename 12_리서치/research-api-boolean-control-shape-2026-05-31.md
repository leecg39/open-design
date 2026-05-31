# Research API boolean control shape validation

Date: 2026-05-31

## Product gap

Boolean research controls change provider behavior: exact matching, image
evidence, raw content, and Tavily auto parameters. The API route converted each
control with `=== true`, so malformed values like `"true"`, `1`, or `"yes"`
became `false` without a warning.

## Evidence

- `/api/research/search` receives JSON from local UI and CLI callers.
- JSON booleans are valid only when the value is actually `true` or `false`.
- The route coerced malformed boolean-like values to false before the research
  layer could report them.
- Silent false is risky because the report looks normal while high-signal
  evidence modes may not have run.

## Upgrade decision

- Forward raw boolean controls from the route into `searchResearch`.
- Normalize only actual `true` values to enabled controls.
- Warn for non-boolean values when optional boolean controls are present.
- Keep invalid values out of the Tavily provider payload.

## A/B validation

- A: malformed boolean controls should appear in returned warnings.
- B: malformed booleans should not send `exact_match`, `include_images`, or
  `auto_parameters`, and raw content should remain explicitly false.

## Non-goals

- Do not accept string booleans as supported API input.
- Do not reject the entire search request for malformed optional booleans.
- Do not change valid `false` behavior.
