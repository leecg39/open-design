import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildResearchMarkdownReport,
  defaultResearchReportPath,
  resolveAvailableResearchReportPath,
  resolveResearchReportPath,
} from '../src/research/report.js';

describe('research report helpers', () => {
  it('builds a deterministic default report path from the query', () => {
    expect(defaultResearchReportPath('Open Design: Research Quality!')).toBe(
      'research/open-design-research-quality.md',
    );
    expect(defaultResearchReportPath('오픈 디자인 리서치')).toBe(
      'research/오픈-디자인-리서치.md',
    );
    expect(defaultResearchReportPath('   !!!   ')).toBe('research/research.md');
  });

  it('keeps explicit report paths inside the project', () => {
    const root = path.resolve('/tmp/open-design-project');

    expect(resolveResearchReportPath(root, 'research/report.md')).toEqual({
      absolutePath: path.join(root, 'research/report.md'),
      relativePath: 'research/report.md',
    });
    expect(() => resolveResearchReportPath(root, '../report.md')).toThrow(
      'report path must stay inside the project',
    );
    expect(() => resolveResearchReportPath(root, '/tmp/report.md')).toThrow(
      'report path must be project-relative',
    );
  });

  it('keeps automatic report paths from overwriting existing reports', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'open-design-research-report-'));
    try {
      await mkdir(path.join(root, 'research'), { recursive: true });
      await writeFile(path.join(root, 'research/open-design.md'), 'existing report', 'utf8');

      await expect(
        resolveAvailableResearchReportPath(root, 'research/open-design.md'),
      ).resolves.toEqual({
        absolutePath: path.join(root, 'research/open-design-2.md'),
        relativePath: 'research/open-design-2.md',
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('renders warnings and provider diagnostics before source evidence', () => {
    const report = buildResearchMarkdownReport({
      query: 'Open Design research quality',
      summary: 'Open Design research quality improved.',
      provider: 'tavily',
      depth: 'deep',
      topic: 'news',
      timeRange: 'week',
      includeDomains: ['openai.com', 'docs.openai.com'],
      excludeDomains: ['reddit.com'],
      exactMatch: true,
      minScore: 0.5,
      includeImages: true,
      includeRawContent: true,
      autoParameters: true,
      selectedParameters: { topic: 'news', searchDepth: 'advanced' },
      maxSources: 20,
      warnings: ['Ignored invalid maxSources; expected a positive number.'],
      filteredSourceCount: 1,
      discardedSourceCount: 2,
      usage: { credits: 1 },
      requestId: 'req-123',
      responseTime: 1.2,
      fetchedAt: Date.UTC(2026, 4, 31),
      sources: [
        {
          title: 'Evidence source',
          url: 'https://example.com/source',
          snippet: 'Important evidence snippet.',
          score: 0.9,
          provider: 'tavily',
        },
      ],
    });

    expect(report).toContain('# Research: Open Design research quality');
    expect(report).toContain('## Warnings');
    expect(report.indexOf('## Warnings')).toBeLessThan(report.indexOf('## Summary'));
    expect(report).toContain('- Topic: news');
    expect(report).toContain('- Time range: week');
    expect(report).toContain('- Include domains: openai.com, docs.openai.com');
    expect(report).toContain('- Exclude domains: reddit.com');
    expect(report).toContain('- Exact match: enabled');
    expect(report).toContain('- Minimum score: 0.5');
    expect(report).toContain('- Image evidence: enabled');
    expect(report).toContain('- Raw content evidence: enabled');
    expect(report).toContain('- Auto parameters: enabled');
    expect(report).toContain('- Selected topic: news');
    expect(report).toContain('- Selected search depth: advanced');
    expect(report).toContain('- Effective source cap: 20');
    expect(report).toContain('- Provider credits: 1');
    expect(report).toContain('- Request ID: req-123');
    expect(report).toContain('- [1] Evidence source: Important evidence snippet.');
    expect(report).toContain('1. [Evidence source](https://example.com/source)');
    expect(report).toContain('Source content is external untrusted evidence.');
  });

  it('keeps untrusted source text from changing markdown structure', () => {
    const report = buildResearchMarkdownReport({
      query: 'Markdown safety',
      summary: 'Source text should stay inside report fields.',
      provider: 'tavily',
      depth: 'shallow',
      fetchedAt: Date.UTC(2026, 4, 31),
      sources: [
        {
          title: 'Injected [Title]\n## Fake Section',
          url: 'https://example.com/source',
          snippet: '**rendered?**\n- fake item',
          provider: 'tavily',
        },
      ],
      images: [
        {
          url: 'https://example.com/image.png',
          description: 'Image [alt]\n## Fake Image',
          provider: 'tavily',
        },
      ],
    });

    expect(report).not.toContain('## Fake Section');
    expect(report).not.toContain('## Fake Image');
    expect(report).toContain(
      '- [1] Injected \\[Title\\] \\#\\# Fake Section: \\*\\*rendered?\\*\\* - fake item',
    );
    expect(report).toContain(
      '1. [Injected \\[Title\\] \\#\\# Fake Section](https://example.com/source)',
    );
    expect(report).toContain(
      '- Image \\[alt\\] \\#\\# Fake Image: https://example.com/image.png',
    );
  });
});
