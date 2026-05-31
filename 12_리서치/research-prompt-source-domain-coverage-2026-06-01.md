# Research prompt source domain coverage

## Insight

Markdown reports now include source domain coverage, but the agent-facing research contract and web `/search` prompt still described only source lists with visible domains. That left fallback reports under-specified when the OD command is unavailable and the agent has to create a report manually.

## A/B verification

- Before: focused daemon and web prompt tests failed because neither prompt contained `source domain coverage`.
- After: both focused tests pass and require source domain coverage in report metadata.

## Upgrade applied

Updated the daemon research command contract and web composer `/search` prompt so saved or fallback reports must include source domain coverage in metadata before summarizing findings.
