# Research report control metadata

Date: 2026-05-31

## Product gap

The automatic research report preserves provider diagnostics and source evidence,
but it does not yet record every search control that shaped the result. A saved
report can omit domain filters, exact-match mode, relevance threshold, image/raw
evidence flags, and provider auto-parameter choices.

## Evidence

- `ResearchFindings` already carries `includeDomains`, `excludeDomains`,
  `exactMatch`, `minScore`, `includeImages`, `includeRawContent`,
  `autoParameters`, and `selectedParameters`.
- `buildResearchMarkdownReport` writes only a subset of metadata.
- The report is meant to be reopened later from Design Files, so a reader should
  understand how the evidence set was constrained without rereading the original
  chat prompt or stdout JSON.

## Upgrade decision

- Add all applied search controls to the report metadata section.
- Preserve selected provider-tuned parameters when `autoParameters` is active.
- Keep this as report rendering only; do not change daemon search behavior or
  provider payloads.

## A/B validation

- A: a report built from findings with filters should include each control in
  the metadata before summary/source sections.
- B: existing warning and source rendering should remain intact.

## Non-goals

- Do not add a new report section.
- Do not duplicate full raw content in metadata.
- Do not infer controls that are absent from findings.
