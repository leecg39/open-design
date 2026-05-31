# Research visual report handoff

Date: 2026-05-31

## Product gap

The visual research option can request and return image evidence, but the daemon-injected research command contract is what the spawned agent actually reads during normal chat runs. If that contract still shows a text-only JSON shape, the agent may ignore images even when the provider returns them.

## Evidence

- Open Design's product loop depends on agent-readable prompt contracts, not only TypeScript DTOs.
- Tavily Search image results are top-level response evidence that can include URL and description fields.
- Source: https://docs.tavily.com/documentation/api-reference/endpoint/search

## Upgrade decision

- Keep the existing `/search --images` behavior.
- Update the daemon research contract's stdout example to include `images` only when requested.
- Add an explicit visual-reference report instruction only when image evidence is requested.
- Clarify CLI aliases in help text so users can discover `--images` and `--visuals`.

## Validation plan

- A: normal research contract should remain text-only.
- B: image-enabled contract should show the image JSON shape and Visual references instruction.
- CLI help remains a command-surface update covered by typecheck and existing CLI argument preservation tests.
