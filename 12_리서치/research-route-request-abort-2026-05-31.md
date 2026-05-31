# Research route request abort propagation

Date: 2026-05-31

## Product gap

`searchResearch` and the Tavily adapter already accept an `AbortSignal`, but the
HTTP route did not connect the client request lifecycle to that signal. If the UI
or CLI disconnected while a provider request was running, the daemon could keep
the Tavily fetch alive even though nobody was waiting for the result.

## Evidence

- `/api/research/search` called `searchResearch` without `signal`.
- `searchResearch` passes `signal` to `tavilySearch`.
- `tavilySearch` already converts upstream aborts into its internal fetch
  controller.
- Other long-running daemon routes use request close wiring to avoid wasted
  provider work after client disconnects.

## Upgrade decision

- Add an `AbortController` per research API request.
- Abort it when the request is aborted before completion or the response closes
  before it is fully written.
- Pass the signal into `searchResearch`.
- Remove route listeners after the request finishes.

## A/B validation

- A: once the provider fetch has captured the daemon-side signal, destroying the
  client request should abort that signal.
- B: normal successful requests should still pass existing research tests.

## Non-goals

- Do not change Tavily timeout behavior.
- Do not add cancellation UI.
- Do not retry aborted provider requests.
