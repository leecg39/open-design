# Research auto parameters

Date: 2026-05-31

## Product gap

The research command currently exposes manual controls for depth, topic, freshness, domains, exact match, images, and raw content. This is precise, but it puts parameter selection on the user or agent. For exploratory queries, the provider can often infer whether a query needs news, finance, or deeper retrieval.

## Evidence

- Tavily Search supports `auto_parameters`.
- Tavily says automatic parameters configure search behavior from query content and intent.
- Explicit user-supplied values still override automatic values.
- `include_answer`, `include_raw_content`, and `max_results` must still be set manually because they affect response size.
- Tavily may automatically set `search_depth` to advanced, and this can use 2 API credits.
- Tavily responses can include an `auto_parameters` object with selected values such as `topic` and `search_depth`.
- Source: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Source: https://docs.tavily.com/documentation/best-practices/best-practices-search

## Upgrade decision

- Add opt-in `autoParameters` support to research.
- Keep the default deterministic path unchanged.
- Forward `auto_parameters: true` only when requested.
- Return normalized provider-selected parameters as `selectedParameters` so reports can explain the provider tuning.
- Expose CLI and composer flags as `--auto-parameters` and shorthand `--auto`.

## A/B validation

- A: default search should not send `auto_parameters` and should not return selected parameters.
- B: auto-parameter search should send `auto_parameters: true`, preserve manual size controls, and surface normalized selected parameters.

## Non-goals

- Do not enable automatic parameters by default.
- Do not hide the potential credit cost.
- Do not remove manual controls.
