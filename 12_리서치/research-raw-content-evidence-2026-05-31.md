# Research raw content evidence

Date: 2026-05-31

## Product gap

The research command currently gives agents short snippets. Snippets are good for quick answers, but they can be too thin for detailed product strategy, market scans, implementation comparisons, or evidence-heavy reports.

## Evidence

- Tavily Search supports `include_raw_content`.
- `include_raw_content` can return cleaned parsed content in markdown or text.
- Tavily Extract best practices also note using Search with `include_raw_content=true` when search results and extracted content are needed together.
- Source: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Source: https://docs.tavily.com/documentation/best-practices/best-practices-extract

## Upgrade decision

- Add opt-in `includeRawContent` support to research.
- Request `include_raw_content: "markdown"` only when explicitly enabled.
- Return normalized, bounded `rawContent` per source so JSON stays useful and not unbounded.
- Expose CLI and composer flags as `--include-raw-content` plus shorthand `--raw-content` and `--raw`.

## A/B validation

- A: default search should keep `include_raw_content: false` and return no raw content.
- B: raw-content search should request markdown raw content and return bounded source `rawContent`.

## Non-goals

- Do not make raw content default.
- Do not return full unbounded page content.
- Do not run a separate Extract API pass.
