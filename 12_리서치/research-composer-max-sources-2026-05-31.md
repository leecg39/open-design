# Research composer max sources

Date: 2026-05-31

## Product gap

The research contract and CLI both support `maxSources`, but the web `/search`
composer ignored a user-entered `--max-sources` flag. A user could ask for a
broader or tighter source cap in chat and still receive the default cap for the
selected depth.

## Evidence

- `ResearchOptions` includes `maxSources`.
- `od research search` forwards `--max-sources` to the daemon.
- The web composer always emitted `--max-sources` from the depth default.
- This made the visible `/search` command less capable than the executable CLI.

## Upgrade decision

- Parse `--max-sources <n>` and `--max-sources=<n>` in the web `/search` path.
- Keep daemon-side validation and clamping as the source of truth.
- Preserve depth defaults when the user does not provide a cap.
- Surface an explicit metadata line when the user provides a cap.

## A/B validation

- A: `/search Open Design` should still emit the shallow default
  `--max-sources 5`.
- B: `/search --max-sources=15 Open Design` should emit
  `--max-sources 15` and include `maxSources: 15` in research metadata.

## Non-goals

- Do not add new UI controls outside the slash command.
- Do not duplicate daemon clamping rules in the web parser.
- Do not change the depth defaults.
