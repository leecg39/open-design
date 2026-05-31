# Research composer invalid filter flags

Date: 2026-05-31

## Product gap

The web `/search` composer accepts filter flags before building the research
command prompt. Invalid filter values such as `--depth broad`,
`--time-range decade`, or invalid domains can stop flag parsing and leak the
flag text into the canonical search query. That makes the provider search less
precise and hides that a requested control was ignored.

## Evidence

- The daemon already reports ignored invalid controls in research JSON warnings.
- The web composer expands `/search` into an agent-facing command prompt before
  the daemon sees the request.
- Invalid numeric slash-command controls now produce parser warnings, but enum,
  date, country, and domain controls can still become query text.

## Upgrade decision

- Treat invalid composer-side depth, topic, country, time-range, date, and
  domain flag values as ignored local parser controls.
- Continue parsing the remaining query after ignored controls.
- Surface prompt-visible parser warnings so the final report can disclose the
  ignored slash-command controls.
- Keep daemon-side validation as the final authority for API requests.

## A/B validation

- A: valid filter flags should still become command flags and metadata.
- B: invalid filter flags should not become query text or command flags, and
  should appear as parser warnings in the prompt.

## Non-goals

- Do not reject sending the prompt.
- Do not duplicate every provider validation rule in the UI.
- Do not change daemon request normalization.
