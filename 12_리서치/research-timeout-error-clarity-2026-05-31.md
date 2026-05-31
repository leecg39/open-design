# Research timeout error clarity

Date: 2026-05-31

## Product gap

Tavily request timeouts and caller cancellations can both surface as generic
fetch failures. For research workflows, the agent should be able to tell whether
the provider timed out, the user cancelled the run, or a different network error
occurred.

## Evidence

- The adapter owns a 30 second timeout controller.
- The adapter also mirrors caller abort signals into the same fetch signal.
- The current catch path wraps every fetch rejection as a generic request
  failure.

## Upgrade decision

- Track whether the adapter timeout fired.
- Return `Tavily request timed out after 30000ms` for timeout-triggered aborts.
- Return `Tavily request aborted` for non-timeout aborts.
- Keep all other fetch errors on the existing `Tavily request failed: ...` path.

## A/B validation

- A: a pre-aborted caller signal should now surface as an explicit abort.
- B: a request aborted by the adapter timer should surface as an explicit
  timeout.

## Non-goals

- Do not change the timeout duration.
- Do not change the public research error code.
- Do not retry provider calls.
