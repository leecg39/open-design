import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildResearchMarkdownReport,
  defaultResearchReportPath,
  resolveAvailableResearchReportPath,
  resolveResearchReportPath,
  writeAvailableResearchReportFile,
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

  it('writes automatic report paths exclusively and retries collisions', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'open-design-research-report-'));
    try {
      await mkdir(path.join(root, 'research'), { recursive: true });
      await writeFile(path.join(root, 'research/open-design.md'), 'existing report', 'utf8');
      await writeFile(path.join(root, 'research/open-design-2.md'), 'second report', 'utf8');

      const report = await writeAvailableResearchReportFile(
        root,
        'research/open-design.md',
        'new report',
      );

      expect(report).toEqual({
        absolutePath: path.join(root, 'research/open-design-3.md'),
        relativePath: 'research/open-design-3.md',
      });
      await expect(
        readFile(path.join(root, 'research/open-design.md'), 'utf8'),
      ).resolves.toBe('existing report');
      await expect(
        readFile(path.join(root, 'research/open-design-2.md'), 'utf8'),
      ).resolves.toBe('second report');
      await expect(readFile(report.absolutePath, 'utf8')).resolves.toBe('new report');
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
    expect(report.indexOf('## Evidence Safety')).toBeLessThan(
      report.indexOf('## Summary'),
    );
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
    expect(report).toContain('- Returned sources: 1');
    expect(report).toContain('- Provider credits: 1');
    expect(report).toContain('- Request ID: req-123');
    expect(report).toContain('- [1] Evidence source: Important evidence snippet.');
    expect(report).toContain('1. [Evidence source](<https://example.com/source>)');
    expect(report).toContain(
      '1. [Evidence source](<https://example.com/source>) (example.com; score 0.9)',
    );
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
      '1. [Injected \\[Title\\] \\#\\# Fake Section](<https://example.com/source>)',
    );
    expect(report).toContain(
      '- Image \\[alt\\] \\#\\# Fake Image: https://example.com/image.png',
    );
  });

  it('renders raw evidence excerpts when raw content is present', () => {
    const report = buildResearchMarkdownReport({
      query: 'Raw evidence',
      summary: 'Raw evidence should be reusable from the saved report.',
      provider: 'tavily',
      depth: 'deep',
      includeRawContent: true,
      fetchedAt: Date.UTC(2026, 4, 31),
      sources: [
        {
          title: 'Primary source',
          url: 'https://example.com/raw',
          snippet: 'Short snippet wins the key finding line.',
          rawContent: 'Full page excerpt with **markdown** and ## headings.',
          rawContentTruncated: true,
          provider: 'tavily',
        },
      ],
    });

    expect(report).toContain('## Raw Evidence Excerpts');
    expect(report).toContain(
      '- [1] Primary source (truncated excerpt): Full page excerpt with \\*\\*markdown\\*\\* and \\#\\# headings.',
    );
  });

  it('keeps the report query from changing markdown structure', () => {
    const report = buildResearchMarkdownReport({
      query: 'Market scan\n## Injected Heading',
      summary: 'Query text should stay in title and metadata fields.',
      provider: 'tavily',
      depth: 'shallow',
      fetchedAt: Date.UTC(2026, 4, 31),
      sources: [
        {
          title: 'Source',
          url: 'https://example.com/source',
          snippet: 'Evidence.',
          provider: 'tavily',
        },
      ],
    });

    expect(report).not.toContain('\n## Injected Heading');
    expect(report).toContain('# Research: Market scan \\#\\# Injected Heading');
    expect(report).toContain('- Query: Market scan \\#\\# Injected Heading');
  });

  it('renders source-level visual evidence with source citations', () => {
    const report = buildResearchMarkdownReport({
      query: 'Visual evidence',
      summary: 'Source-level images should stay tied to their source.',
      provider: 'tavily',
      depth: 'shallow',
      includeImages: true,
      fetchedAt: Date.UTC(2026, 4, 31),
      sources: [
        {
          title: 'Visual source [one]',
          url: 'https://example.com/source',
          snippet: 'Visual evidence.',
          images: [
            {
              url: 'https://example.com/source-image.png',
              description: 'Diagram [source]',
              provider: 'tavily',
            },
          ],
          provider: 'tavily',
        },
      ],
    });

    expect(report).toContain('## Source-Level Visual Evidence');
    expect(report).toContain(
      '- [1.1] [1] Visual source \\[one\\]: Diagram \\[source\\]: https://example.com/source-image.png',
    );
  });

  it('wraps source link destinations so URLs with parentheses stay intact', () => {
    const report = buildResearchMarkdownReport({
      query: 'Link destination',
      summary: 'Links with parentheses should remain clickable.',
      provider: 'tavily',
      depth: 'shallow',
      fetchedAt: Date.UTC(2026, 4, 31),
      sources: [
        {
          title: 'Parenthesized URL',
          url: 'https://example.com/docs/research_(2026)',
          snippet: 'Evidence.',
          provider: 'tavily',
        },
      ],
    });

    expect(report).toContain(
      '1. [Parenthesized URL](<https://example.com/docs/research_(2026)>)',
    );
  });

  it('keeps provider summaries from changing markdown structure', () => {
    const report = buildResearchMarkdownReport({
      query: 'Summary safety',
      summary: 'Provider answer\n## Injected Summary\n**bold claim**',
      provider: 'tavily',
      depth: 'shallow',
      fetchedAt: Date.UTC(2026, 4, 31),
      sources: [
        {
          title: 'Source',
          url: 'https://example.com/source',
          snippet: 'Evidence.',
          provider: 'tavily',
        },
      ],
    });

    expect(report).not.toContain('\n## Injected Summary');
    expect(report).toContain(
      'Provider answer \\#\\# Injected Summary \\*\\*bold claim\\*\\*',
    );
  });

  it('escapes link-breaking source titles and leading summary markers', () => {
    const report = buildResearchMarkdownReport({
      query: 'Escape coverage',
      summary: '> injected quote',
      provider: 'tavily',
      depth: 'shallow',
      fetchedAt: Date.UTC(2026, 5, 1),
      sources: [
        {
          title: 'Breaking ](https://bad.example)',
          url: 'https://example.com/source',
          snippet: '1. list-like snippet',
          provider: 'tavily',
        },
      ],
    });

    expect(report).not.toContain('\n> injected quote');
    expect(report).toContain('\\> injected quote');
    expect(report).toContain(
      '1. [Breaking \\]\\(https://bad.example\\)](<https://example.com/source>)',
    );
    expect(report).toContain(
      '- [1] Breaking \\]\\(https://bad.example\\): 1\\. list-like snippet',
    );
  });
});
