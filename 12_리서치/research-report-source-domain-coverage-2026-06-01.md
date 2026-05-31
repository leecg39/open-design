# Research report source domain coverage

## Insight

Saved research reports list sources individually, but readers previously had to scan the full source list to notice whether evidence was concentrated on one domain. A compact domain coverage line near the top makes source diversity and potential evidence bias visible before the summary is interpreted.

## A/B verification

- Before: `pnpm --filter @open-design/daemon exec vitest run -c vitest.config.ts tests/research-report.test.ts -t "source domain coverage"` failed because report metadata only showed the source count.
- After: the same focused test passes and renders `Source domains: example.com (2), docs.example.com` before the summary.

## Upgrade applied

Research Markdown reports now summarize source domains in first-seen order, including counts for repeated domains. The source list remains unchanged for detailed citation review.
