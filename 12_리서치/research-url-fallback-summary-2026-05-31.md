# Research URL fallback summary

Date: 2026-05-31

## Product gap

When the provider does not return an answer, Open Design synthesizes a fallback
summary from source snippets or raw content. If a source has a valid citation URL
but no snippet and no raw content, the fallback line can be empty, leaving the
report with a citation shell but no useful pointer.

## Evidence

- Source URLs are already normalized and required for usable citations.
- The fallback summary is used only when the provider answer is missing.
- Some provider results may have title and URL but no content excerpt.

## Upgrade decision

- Keep snippet-first behavior.
- Keep raw-content excerpts as the second fallback.
- Use the normalized source URL as the final fallback text when no excerpt is
  available.
- Mark URL-derived fallback lines as `[url]` so they are not mistaken for source
  content.

## A/B validation

- A: raw-content fallback should still produce `[raw excerpt]`.
- B: URL-only provider results should produce a non-empty fallback line with
  `[url]`.

## Non-goals

- Do not fetch pages to fill missing snippets.
- Do not change provider summaries when an answer is present.
- Do not invent source content from the URL.
