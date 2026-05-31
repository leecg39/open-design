# Research date range controls

Date: 2026-05-31

## Why this matters

Open Design already has an agent-callable research path, and the previous two upgrades added depth and freshness controls. The remaining gap is precise date scoping: "last week" and "this month" are useful defaults, but product, finance, changelog, and policy research often needs a fixed window that can be reproduced later.

## Current state

- `/search` can express `--depth`, `--topic`, and `--time-range`.
- The daemon can forward Tavily `search_depth`, `topic`, and `time_range`.
- `ResearchSource.publishedAt` already preserves the returned publish date, so date-filtered runs are inspectable after the fact.

## External evidence

- Tavily Search API supports `start_date`, returning results after a specified date, and requires `YYYY-MM-DD` format. Source: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Tavily Search API supports `end_date`, returning results before a specified date, and requires `YYYY-MM-DD` format. Source: https://docs.tavily.com/documentation/api-reference/endpoint/search
- Tavily's Web Search Essentials guide lists `start_date` and `end_date` alongside `time_range` as core recency controls. Source: https://docs.tavily.com/examples/quick-tutorials/search-api

## Upgrade decision

Add exact date range controls without changing the default research behavior:

- API and contracts accept optional `startDate` and `endDate` fields.
- Daemon forwards valid dates to Tavily as `start_date` and `end_date`.
- CLI accepts `--start-date YYYY-MM-DD` and `--end-date YYYY-MM-DD`.
- `/search` accepts the same flags and includes them in the agent command contract.
- Invalid date tokens are not silently sent to Tavily.

## A/B test plan

- A: Current code cannot express a fixed date window; users must write date words inside the query and hope the search provider infers the window.
- B: After the change, callers can pass exact dates; prompts show the exact flags; Tavily request bodies include `start_date` and `end_date` only when they are valid.

## Non-goals

- No provider switch.
- No timezone conversion.
- No automatic date inference from natural language.
- No UI date picker yet; slash flags keep this upgrade small and testable.
