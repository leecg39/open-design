# Research reportPath contract consistency

Date: 2026-05-31

## Product gap

`od research search --save-report` now adds `reportPath` to stdout JSON, and the
agent-facing command contract shows `reportPath` in the JSON example. The shared
`ResearchFindings` contract did not include that optional field, and the root
CLI help still showed the older research command without `--save-report`.

## Evidence

- `apps/daemon/src/cli.ts` writes `{ ...findings, reportPath }` when a report is
  saved.
- `apps/daemon/src/prompts/research-contract.ts` includes
  `"reportPath": "research/example.md"` in the example stdout JSON.
- `packages/contracts/src/api/research.ts` is the shared DTO surface but did not
  model `reportPath`.
- `printRootHelp()` still listed only the old research flags.

## Upgrade decision

- Add optional `reportPath` to `ResearchFindings`.
- Update the root CLI help research usage to include `--save-report` and
  `--report research/file.md`.
- Keep daemon API behavior unchanged; this field is populated by the CLI when it
  writes a report.

## A/B validation

- A: shared contracts typecheck should accept `reportPath` as part of research
  findings.
- B: root help and research subcommand help should both advertise the report
  persistence flags.

## Non-goals

- Do not make `reportPath` required for daemon API responses.
- Do not change saved report contents.
- Do not stage unrelated CLI browser-opening changes.
