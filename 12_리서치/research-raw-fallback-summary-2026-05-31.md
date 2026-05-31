# Research raw fallback summary

Date: 2026-05-31

## Product gap

When Tavily does not return an answer, the daemon synthesizes a fallback summary from source snippets. That works for normal searches, but evidence-heavy raw-content searches can still produce a weak fallback if snippets are empty while `rawContent` contains useful source text.

## Evidence

- `includeRawContent` is explicit opt-in and returns bounded source evidence.
- `synthesizeFallbackSummary` currently reads only `sources[].snippet`.
- The fallback summary is used only when the provider answer is empty.

## Upgrade decision

- Keep snippet-first fallback behavior.
- Use bounded `rawContent` as a secondary excerpt only when snippet is empty.
- Mark raw-derived fallback lines as `[raw excerpt]` so reports do not mistake them for provider snippets.

## A/B validation

- A: normal searches with snippets should keep existing fallback wording.
- B: raw-content searches with empty snippets should produce a useful fallback summary from raw excerpts.

## Non-goals

- Do not use raw content when provider answer is present.
- Do not make raw content default.
- Do not include long raw excerpts in the summary.
