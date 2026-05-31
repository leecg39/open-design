# Tavily direct evidence response gating

## Insight

After direct boolean request controls were normalized, the response parser still used the raw `includeImages` and `includeRawContent` inputs. A truthy string could therefore suppress provider request flags but still allow returned image or raw-content fields into the direct helper output if the provider/mock response contained them.

Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## A/B verification

- Before: the focused direct Tavily test failed because top-level images, source images, and raw content were retained when evidence controls were invalid string values.
- After: response parsing uses the same normalized evidence booleans as request construction, so evidence fields are included only when explicitly requested with literal `true`.

## Upgrade applied

Reused normalized `includeImages` and `includeRawContent` controls while normalizing Tavily response images and raw-content excerpts.
