# Research pre-aborted signal handling

Date: 2026-05-31

## Product gap

Research calls accept an `AbortSignal`, but the Tavily adapter only listened for
future abort events. If the signal was already aborted before the request was
created, the provider fetch could still start instead of respecting the
cancelled state.

## Evidence

- Long-running research may be cancelled by the caller before the network layer
  is reached.
- The adapter creates its own timeout `AbortController` and forwards that signal
  to `fetch`.
- Existing code wires future abort events, but does not mirror an already
  aborted caller signal.

## Upgrade decision

- Immediately abort the adapter controller when the caller signal is already
  aborted.
- Keep the existing future-abort propagation.
- Remove the listener after completion to avoid retaining request state.

## A/B validation

- A: a pre-aborted caller signal should not reach fetch as an active signal.
- B: the adapter should pass an already aborted fetch signal and surface the
  resulting provider failure.

## Non-goals

- Do not change timeout duration.
- Do not change the public error code.
- Do not add new cancellation UI.
