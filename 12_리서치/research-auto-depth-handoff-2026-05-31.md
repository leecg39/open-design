# Research auto depth handoff

Date: 2026-05-31

## Product gap

`autoParameters` lets Tavily tune search behavior from query intent, but the adapter still sends a default `search_depth: basic` for shallow research. Because explicit parameters override automatic choices, the default can unintentionally block provider depth tuning.

## Evidence

- Tavily automatic parameters are designed to set supported search behavior from the query.
- Explicit user-supplied values should still override automatic choices.
- Open Design defaults depth to shallow when the user does not request a deeper search.

## Upgrade decision

- When `autoParameters` is enabled with the default shallow depth, omit `search_depth` and let Tavily choose.
- Preserve explicit medium/deep behavior as `advanced`.
- Keep max source caps and answer/raw-content controls explicit because they govern response size and cost.
- Keep returned `depth` as the requested Open Design depth and return `selectedParameters` for provider choices.

## A/B validation

- A: normal default research should still send `search_depth: basic`.
- B: auto-parameter default research should send `auto_parameters: true` without `search_depth`.
- C: explicit deep research with auto parameters should still send `search_depth: advanced`.

## Non-goals

- Do not make auto parameters default.
- Do not let auto parameters override explicit deep search.
