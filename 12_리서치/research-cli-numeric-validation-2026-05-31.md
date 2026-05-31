# Research CLI numeric validation

Date: 2026-05-31

## Product gap

The daemon can warn about invalid or clamped numeric research controls, but the CLI currently converts `--min-score` and `--max-sources` with `Number()` and omits non-finite values from the request body. That means a typo like `--min-score high` can disappear before the daemon has a chance to report it.

## Evidence

- `od research search` is the command agents are instructed to run for research.
- The CLI serializes request JSON before the daemon validation layer.
- Non-finite `Number(...)` results are currently skipped by the JSON body spread checks.
- Silent omission is worse than a clear command-line error because the user believes a quality control was applied.

## Upgrade decision

- Parse optional numeric CLI flags through an explicit helper.
- Reject non-finite `--min-score` and `--max-sources` values before calling the daemon.
- Preserve daemon-side clamping for finite out-of-range values.

## A/B validation

- A: valid numeric flags should parse and be preserved.
- B: invalid numeric flags should produce a deterministic CLI parse error.

## Non-goals

- Do not reject finite out-of-range values in the CLI.
- Do not change daemon validation semantics.
