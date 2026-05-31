# Research CLI automatic report persistence

Date: 2026-05-31

## Product gap

The research command returned strong JSON, but report persistence depended on
the agent manually turning that JSON into a Markdown file. That made the
Design Files artifact easy to forget, especially when the agent focused on
summarizing findings in chat.

## Evidence

- The command contract told agents to write `research/<safe-query-slug>.md`.
- `/search` prompts duplicated the same instruction in the web composer.
- The CLI itself had no report-writing option, so success of the durable
  artifact depended on prompt compliance rather than product behavior.
- Research findings already include enough normalized metadata, warnings,
  source lists, and provider diagnostics to render a reusable report locally.

## Upgrade decision

- Add `od research search --save-report` to write a deterministic Markdown
  report under `research/<safe-query-slug>.md`.
- Add `--report <project-relative-path>` for explicit report destinations.
- Keep stdout as one JSON object and add `reportPath` only when a report is
  written.
- Update daemon and web research command contracts to include `--save-report`.

## A/B validation

- A: without `--save-report`, the CLI continues to print daemon JSON only.
- B: with `--save-report`, the CLI writes a Markdown report, returns
  `reportPath`, preserves warnings before the summary, and keeps the path inside
  the project.

## Non-goals

- Do not change the daemon API response shape.
- Do not add a new database-backed report model.
- Do not allow absolute or parent-directory report paths.
