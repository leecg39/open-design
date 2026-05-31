# Research effective source cap reporting

Date: 2026-05-31

## Product gap

Research requests can set `maxSources`, and the daemon clamps that value to the
provider limit. The returned JSON records depth and filters, but not the
effective source cap. A later report cannot tell whether a short source list was
caused by provider scarcity or by an intentionally low cap.

## Evidence

- `ResearchOptions.maxSources` controls provider result count.
- The daemon clamps source caps to Tavily's supported maximum.
- Existing findings include other effective controls such as depth, topic,
  domains, exact match, and `minScore`.

## Upgrade decision

- Add `maxSources` to `ResearchFindings`.
- Return the effective, clamped cap from the daemon.
- Show `maxSources` in the command-contract JSON example.

## A/B validation

- A: `maxSources: 50` should still clamp to provider limit 20.
- B: findings should now include `maxSources: 20`, proving the effective cap
  used for the provider request.

## Non-goals

- Do not change provider caps.
- Do not change depth defaults.
- Do not infer how many results the provider could have returned without the cap.
