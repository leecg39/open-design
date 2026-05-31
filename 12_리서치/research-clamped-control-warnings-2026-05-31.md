# Research clamped control warnings

Date: 2026-05-31

## Product gap

The research API clamps some numeric controls to provider-supported ranges. That is safer than forwarding invalid requests, but the result can be surprising. A user can request a higher source cap or score threshold and receive a smaller effective setting without knowing it.

## Evidence

- Tavily Search supports a maximum result cap of 20 in the current adapter.
- `minScore` is normalized to the supported 0..1 range before local filtering.
- The research response now supports `warnings`, which is the right place to explain adjusted controls.

## Upgrade decision

- Add warnings when `minScore` is clamped below 0 or above 1.
- Add warnings when `maxSources` is clamped to the Tavily provider cap.
- Keep the applied normalized values unchanged.
- Keep invalid non-numeric controls as ignored warnings.

## A/B validation

- A: in-range numeric controls should produce no clamp warnings.
- B: out-of-range numeric controls should still run, but explain the applied clamp.

## Non-goals

- Do not reject high source caps.
- Do not change the provider maximum.
- Do not change default source caps.
