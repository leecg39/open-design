# Research source-level images

Date: 2026-05-31

## Product gap

Visual research currently keeps Tavily's top-level image references, but it drops images attached to individual search results. That weakens design research because a report can show useful visual references without preserving which source produced each image.

## Evidence

- Tavily Search says `include_images` returns a top-level `images` list.
- Tavily Search also returns an `images` array inside each result object with images extracted from that specific source.
- `include_image_descriptions` can add descriptive text for each image.
- Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## Upgrade decision

- Preserve per-source images when `includeImages` is enabled.
- Keep the default non-visual response unchanged.
- Normalize and cap per-source images separately from top-level images to avoid oversized JSON.
- Mention source-level images in the research command contract so reports can keep visual evidence tied to citations.

## A/B validation

- A: default search should not expose source images even if the provider returns them.
- B: visual search should expose normalized, deduped, bounded source images on the relevant source.

## Non-goals

- Do not fetch images separately.
- Do not store image files locally.
- Do not add source images when `includeImages` is disabled.
