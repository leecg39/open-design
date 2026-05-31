# Research composer calendar date validation

Date: 2026-05-31

## Product gap

The web `/search` composer validates date flags with a `YYYY-MM-DD` regex only.
That allows impossible calendar dates such as `2026-02-31` into the generated
research command. The daemon later ignores invalid dates, but the
agent-facing command prompt should be as accurate as possible before execution.

## Evidence

- The daemon already validates date flags by round-tripping through a UTC date.
- The web composer builds the concrete `od research search` command examples.
- A syntactically valid but impossible date can mislead the agent and user about
  the actual date filter used.

## Upgrade decision

- Keep the existing `YYYY-MM-DD` shape requirement.
- Add calendar validity checking in the web `/search` parser.
- Reuse the existing parser-warning path for impossible dates.

## A/B validation

- A: valid dates such as `2026-05-31` should still become research metadata and
  command flags.
- B: impossible dates such as `2026-02-31` should be ignored with a parser
  warning and not leak into the query or command.

## Non-goals

- Do not add relative date parsing.
- Do not change daemon validation.
- Do not reject sending the prompt.
