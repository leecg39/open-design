# Research domain conflict resolution

Date: 2026-05-31

## Product gap

The research API supports both `includeDomains` and `excludeDomains`. If the same normalized domain appears in both lists, the provider request becomes self-conflicting: the user is asking for a domain to be included and excluded at the same time.

## Evidence

- Domain filters are normalized independently before being forwarded to Tavily.
- Existing warnings already report invalid, duplicate, or excess domain entries.
- A conflict between include and exclude lists is not invalid input in isolation, but it changes the effective provider request and should be visible.

## Upgrade decision

- Treat `includeDomains` as the stronger intent.
- Remove overlapping domains from `excludeDomains`.
- Add a warning when overlapping exclude entries are removed.
- Keep non-overlapping excludes unchanged.

## A/B validation

- A: non-overlapping include/exclude filters should be forwarded unchanged.
- B: overlapping domains should be removed from excludes and surfaced in `warnings`.

## Non-goals

- Do not reject the search request.
- Do not remove domains from `includeDomains`.
- Do not infer parent-domain relationships beyond exact normalized matches.
