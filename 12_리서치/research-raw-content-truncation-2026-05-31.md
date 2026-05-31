# Research raw content truncation

Date: 2026-05-31

## Product gap

Raw page content is intentionally bounded before it is returned to agents. That protects JSON size and prompt usage, but the current response does not say whether `rawContent` is the full cleaned page content or only a clipped excerpt.

## Evidence

- The adapter limits returned `rawContent` to 4,000 characters.
- Evidence-heavy reports may quote or reason from `rawContent`.
- Without a truncation flag, an agent can overstate coverage by treating a clipped excerpt as the full source page.

## Upgrade decision

- Add optional `rawContentTruncated` to each source.
- Set it only when `rawContent` is returned and the provider content exceeded the local limit.
- Update report instructions so truncated raw content is treated as excerpt evidence.

## A/B validation

- A: default search should still return no raw content metadata.
- B: raw-content search with long provider content should return bounded `rawContent` and `rawContentTruncated: true`.

## Non-goals

- Do not raise the raw content limit.
- Do not add a second extraction pass.
- Do not expose raw content by default.
