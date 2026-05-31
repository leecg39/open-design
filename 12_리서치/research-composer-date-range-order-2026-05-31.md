# Research composer date range order

Date: 2026-05-31

## Product gap

The web `/search` composer validates individual date flags, but it can still
build an agent-facing command where `--start-date` is later than `--end-date`.
The daemon rejects that request, so the first research action can fail even
though the composer had enough information to catch the invalid range.

## Evidence

- The daemon rejects reversed exact date ranges with `INVALID_DATE_RANGE`.
- The web composer already parses both date flags before building the command
  examples.
- The composer now has parser warnings for ignored local controls.

## Upgrade decision

- Detect `startDate > endDate` in the web `/search` parser.
- Drop both exact date filters when the local range is reversed.
- Add a parser warning so the report can disclose that the local slash-command
  date range was ignored.
- Let valid ordered date ranges continue unchanged.

## A/B validation

- A: valid exact date ranges should still become command flags and metadata.
- B: reversed exact date ranges should not become command flags or metadata, and
  should produce a parser warning.

## Non-goals

- Do not rewrite the user's dates.
- Do not infer a replacement date range.
- Do not change daemon-side validation.
