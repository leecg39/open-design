# Research source cap report metadata

Date: 2026-05-31

## Product gap

Research findings now expose the effective `maxSources` value, but report
prompts do not explicitly ask agents to preserve it. Without that instruction, a
reusable report can omit the source cap and make the source list look complete
when it may be capped.

## Evidence

- `ResearchFindings.maxSources` records the effective cap after daemon
  normalization.
- The report contract already preserves warnings, discarded sources, filtered
  sources, and provider diagnostics when present.
- Source count is part of interpreting research coverage and cost.

## Upgrade decision

- Tell agents to include `maxSources` in report metadata when it is present.
- Apply the instruction in both daemon and web `/search` prompts.
- Keep the report wording optional because old JSON may not include the field.

## A/B validation

- A: existing prompt checks should still include warnings and diagnostics.
- B: upgraded prompts should mention `maxSources` as report metadata.

## Non-goals

- Do not alter source cap behavior.
- Do not require agents to infer uncapped source availability.
- Do not change report file paths.
