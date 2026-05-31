# Research composer invalid numeric flags

Date: 2026-05-31

## Product gap

The web `/search` composer parses numeric flags before building the agent-facing
research command. Invalid numeric values can either leak into the query text or,
for small fractional source caps, produce `--max-sources 0` in the command
example.

## Evidence

- `/search --max-sources=15 ...` is supported by the composer.
- The parser floors numeric `maxSources` values.
- Values between 0 and 1 floor to 0, which is not a useful source cap.
- Invalid `--min-score` values currently stop flag parsing and can become part
  of the search query.

## Upgrade decision

- Treat invalid `--min-score` and `--max-sources` values as ignored controls.
- Continue parsing the remaining query after ignored numeric controls.
- Add prompt-visible parser warnings so the report can disclose ignored local
  slash-command controls.
- Keep daemon-side validation as the final authority for API requests.

## A/B validation

- A: valid numeric flags should still become command flags and metadata.
- B: invalid numeric flags should not become query text or command flags, and
  should appear as parser warnings in the prompt.

## Non-goals

- Do not add new visual form controls.
- Do not reject sending the prompt.
- Do not duplicate every daemon validation rule in the UI parser.
