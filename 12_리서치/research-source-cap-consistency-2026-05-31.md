# Research source cap consistency

Date: 2026-05-31

## Product gap

The shared research contract advertises `deep` research as 30 default sources, while the daemon and UI already clamp or request 20. That mismatch creates a hidden contract bug: clients importing the contract can believe 30 is supported, but Tavily-backed execution returns at most 20.

## Evidence

- Tavily Search `max_results` is capped at 20.
- The daemon local cap constant is 20.
- The `/search --depth deep` composer already emits `--max-sources 20`.
- Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## Upgrade decision

Make the shared `RESEARCH_DEFAULT_MAX_SOURCES.deep` value match the executable product behavior: 20.

## A/B validation

- A: old contract default says deep = 30, then daemon silently clamps to 20.
- B: new contract default says deep = 20, matching UI, prompt contract, and provider limit.

## Non-goals

- Do not raise provider caps.
- Do not change shallow or medium defaults.
