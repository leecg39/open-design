# Research freshness controls — 2026-05-31

## Goal

Improve Open Design's research-grounded artifact loop for current events, product launches, pricing changes, and "latest" questions.

## Local finding

- The first improvement added depth-aware research, but research requests still cannot express freshness or source category.
- `ResearchSource` already preserves `publishedAt` when Tavily returns `published_date`, so the data model can benefit from news/time filters without a storage migration.
- `/search` is the fastest user path for research. It should let users request current coverage without manually editing daemon JSON.

## External evidence

- Tavily Search API supports `topic` with `general`, `news`, and `finance`; its docs describe `news` as useful for real-time updates and current events. Source: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Tavily Search API supports `time_range` values `day`, `week`, `month`, and `year` to filter by publish or update date. Source: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Tavily's Web Search Essentials guide lists filtering by recency and news sources as core search skills, and names `time_range`, `start_date`, and `end_date` as critical knobs. Source: https://docs.tavily.com/examples/quick-tutorials/search-api
- Tavily's Product News Tracker tutorial recommends `topic = news` and `time_range = month` for third-party product coverage. Source: https://docs.tavily.com/examples/quick-tutorials/product-news-tracker

## Decision

Add explicit freshness controls without changing provider architecture:

- `topic`: `general`, `news`, `finance`.
- `timeRange`: `day`, `week`, `month`, `year`.
- CLI flags: `--topic <general|news|finance>` and `--time-range <day|week|month|year>`.
- `/search` shortcuts:
  - `--news` maps to `topic=news`.
  - `--finance` maps to `topic=finance`.
  - `--day`, `--week`, `--month`, `--year` map to `timeRange`.

## A/B criteria

- A: Current code cannot pass freshness/category constraints to Tavily.
- B: After the change, CLI/API/composer metadata preserve topic/timeRange, prompts show the exact flags, and Tavily request bodies include `topic` and `time_range` only when requested.

Only ship if tests prove default research remains unchanged and freshness filters are forwarded end to end.
