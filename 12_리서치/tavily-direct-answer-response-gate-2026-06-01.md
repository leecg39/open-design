# Tavily direct answer response gate

## Insight

Tavily Search exposes `include_answer` as the control for whether an LLM-generated answer is included. The direct helper forwarded `includeAnswer: false` correctly, but still surfaced a provider `answer` field if one appeared in the response.

Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B verification

- Before: the focused direct helper test failed because `includeAnswer: false` sent `include_answer: false` but returned `output.answer` from the mocked provider response.
- After: the same request keeps `include_answer: false` and returns an empty direct `answer`.

## Upgrade applied

Gated direct answer parsing with the normalized `includeAnswer` control so disabled answers remain disabled across request and response handling.
