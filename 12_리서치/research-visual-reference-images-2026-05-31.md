# Research visual reference images

Date: 2026-05-31

## Product gap

Open Design produces visual artifacts, but the research command currently returns text-only findings. For visual briefs such as product pages, venue pages, brand refreshes, dashboards, and moodboards, the agent needs inspectable reference images as evidence, not just snippets.

## External evidence

- Tavily Search supports `include_images` to add query-related image results.
- Tavily Search supports `include_image_descriptions` when `include_images` is enabled, returning image entries with `url` and `description`.
- Tavily's response format includes top-level `images`, and docs note per-result images can also appear inside individual results.
- Source: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Source: https://docs.tavily.com/sdk/python/reference

## Upgrade decision

Add an opt-in visual research mode:

- Add `includeImages?: boolean` to the research contract.
- Add `images?: ResearchImage[]` to returned findings.
- Send `include_images: true` and `include_image_descriptions: true` only when explicitly requested.
- Parse both Tavily image shapes: plain URL strings and `{ url, description }` objects.
- Expose CLI and composer flags as `--include-images` plus shorthand `--images` / `--visuals`.

## A/B validation plan

- A: regular search should not send image flags and should return no images.
- B: image-enabled search should send both image flags and return normalized image evidence.
- Composer test should prove `/search --images ...` injects the flag into command examples and research metadata.
- Contract prompt test should prove the agent-facing command advertises the visual option only when requested.

## Non-goals

- Do not download or proxy remote images.
- Do not make images the default, because image search can increase latency and response size.
- Do not change artifact generation rules; this only enriches research evidence.
