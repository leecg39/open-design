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
  writeResearchReportFile,
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
    expect(defaultResearchReportPath('CON')).toBe('research/research-con.md');
    expect(defaultResearchReportPath('COM1')).toBe('research/research-com1.md');
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

  it('rejects explicit report paths that look like directories', () => {
    const root = path.resolve('/tmp/open-design-project');

    expect(() => resolveResearchReportPath(root, 'research/')).toThrow(
      'report path must include a file name',
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

  it('passes the selected automatic report path into generated contents', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'open-design-research-report-'));
    try {
      await mkdir(path.join(root, 'research'), { recursive: true });
      await writeFile(path.join(root, 'research/open-design.md'), 'existing report', 'utf8');

      const report = await writeAvailableResearchReportFile(
        root,
        'research/open-design.md',
        (candidate) => `report path: ${candidate.relativePath}`,
      );

      expect(report.relativePath).toBe('research/open-design-2.md');
      await expect(readFile(report.absolutePath, 'utf8')).resolves.toBe(
        'report path: research/open-design-2.md',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('writes explicit report paths without overwriting existing files', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'open-design-research-report-'));
    try {
      await mkdir(path.join(root, 'research'), { recursive: true });
      await writeFile(path.join(root, 'research/report.md'), 'existing report', 'utf8');

      await expect(
        writeResearchReportFile(root, 'research/report.md', 'new report'),
      ).rejects.toMatchObject({
        code: 'EEXIST',
        message: 'report path already exists: research/report.md',
      });
      await expect(readFile(path.join(root, 'research/report.md'), 'utf8')).resolves.toBe(
        'existing report',
      );

      const report = await writeResearchReportFile(
        root,
        'research/new-report.md',
        (candidate) => `report path: ${candidate.relativePath}`,
      );

      expect(report.relativePath).toBe('research/new-report.md');
      await expect(readFile(report.absolutePath, 'utf8')).resolves.toBe(
        'report path: research/new-report.md',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('renders warnings and provider diagnostics before source evidence', () => {
    const report = buildResearchMarkdownReport({
      query: 'Open Design research quality',
      reportPath: 'research/open-design-quality.md',
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
    expect(report).toContain('- Report path: research/open-design-quality.md');
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

  it('keeps reports writable when fetchedAt is outside the Date range', () => {
    const report = buildResearchMarkdownReport({
      query: 'Timestamp safety',
      summary: 'Invalid timestamps should not block report writing.',
      provider: 'tavily',
      depth: 'shallow',
      fetchedAt: 1e100,
      sources: [
        {
          title: 'Source',
          url: 'https://example.com/source',
          snippet: 'Evidence.',
          provider: 'tavily',
        },
      ],
    });

    expect(report).toContain('- Fetched: unknown');
    expect(report).toContain('Invalid timestamps should not block report writing.');
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

  it('keeps visual evidence urls from changing markdown structure', () => {
    const report = buildResearchMarkdownReport({
      query: 'Visual URL safety',
      summary: 'Image URLs should remain display text.',
      provider: 'tavily',
      depth: 'shallow',
      includeImages: true,
      fetchedAt: Date.UTC(2026, 4, 31),
      sources: [
        {
          title: 'Visual source',
          url: 'https://example.com/source',
          snippet: 'Visual evidence.',
          images: [
            {
              url: 'https://example.com/source.png\n## Injected Source Image',
              provider: 'tavily',
            },
          ],
          provider: 'tavily',
        },
      ],
      images: [
        {
          url: 'https://example.com/visual.png\n## Injected Visual Image',
          provider: 'tavily',
        },
      ],
    });

    expect(report).not.toContain('\n## Injected Source Image');
    expect(report).not.toContain('\n## Injected Visual Image');
    expect(report).toContain(
      '- [1.1] [1] Visual source: https://example.com/source.png \\#\\# Injected Source Image',
    );
    expect(report).toContain(
      '- https://example.com/visual.png \\#\\# Injected Visual Image',
    );
  });

  it('strips credentials from visual evidence urls', () => {
    const report = buildResearchMarkdownReport({
      query: 'Visual credential safety',
      summary: 'Image URLs should not expose credentials.',
      provider: 'tavily',
      depth: 'shallow',
      includeImages: true,
      fetchedAt: Date.UTC(2026, 5, 1),
      sources: [
        {
          title: 'Visual source',
          url: 'https://example.com/source',
          snippet: 'Visual evidence.',
          images: [
            {
              url: 'https://user:secret@example.com/source-image.png',
              provider: 'tavily',
            },
          ],
          provider: 'tavily',
        },
      ],
      images: [
        {
          url: 'https://user:secret@example.com/top-image.png',
          provider: 'tavily',
        },
      ],
    });

    expect(report).toContain(
      '- [1.1] [1] Visual source: https://example.com/source-image.png',
    );
    expect(report).toContain('- https://example.com/top-image.png');
    expect(report).not.toContain('user:secret@');
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

  it('keeps unsafe source link destinations on one markdown line', () => {
    const report = buildResearchMarkdownReport({
      query: 'Link destination safety',
      summary: 'Source URLs should not split markdown links.',
      provider: 'tavily',
      depth: 'shallow',
      fetchedAt: Date.UTC(2026, 4, 31),
      sources: [
        {
          title: 'Source',
          url: 'https://example.com/source path\n## Injected Link',
          snippet: 'Evidence.',
          provider: 'tavily',
        },
      ],
    });

    expect(report).not.toContain('\n## Injected Link');
    expect(report).toContain(
      '1. [Source](<https://example.com/source%20path%20##%20Injected%20Link>)',
    );
  });

  it('neutralizes non-web source link destinations', () => {
    const report = buildResearchMarkdownReport({
      query: 'Link scheme safety',
      summary: 'Unsafe source URL schemes should not be clickable.',
      provider: 'tavily',
      depth: 'shallow',
      fetchedAt: Date.UTC(2026, 4, 31),
      sources: [
        {
          title: 'Script URL',
          url: 'javascript:alert(1)',
          snippet: 'Evidence.',
          provider: 'tavily',
        },
      ],
    });

    expect(report).toContain('1. [Script URL](<about:blank>)');
    expect(report).not.toContain('](<javascript:alert(1)>)');
  });

  it('strips credentials from source link destinations', () => {
    const report = buildResearchMarkdownReport({
      query: 'Link credential safety',
      summary: 'Credentials should not be rendered in source links.',
      provider: 'tavily',
      depth: 'shallow',
      fetchedAt: Date.UTC(2026, 4, 31),
      sources: [
        {
          title: 'Credential URL',
          url: 'https://user:secret@example.com/source',
          snippet: 'Evidence.',
          provider: 'tavily',
        },
      ],
    });

    expect(report).toContain('1. [Credential URL](<https://example.com/source>)');
    expect(report).not.toContain('user:secret@');
  });

  it('strips credentials from key finding URL fallbacks', () => {
    const report = buildResearchMarkdownReport({
      query: 'Key finding URL credential safety',
      summary: 'URL fallbacks should not expose credentials.',
      provider: 'tavily',
      depth: 'shallow',
      fetchedAt: Date.UTC(2026, 5, 1),
      sources: [
        {
          title: 'Credential URL fallback',
          url: 'https://user:secret@example.com/source',
          snippet: '',
          provider: 'tavily',
        },
      ],
    });

    expect(report).toContain(
      '- [1] Credential URL fallback: https://example.com/source',
    );
    expect(report).not.toContain('user:secret@');
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
      'Provider answer\n\\#\\# Injected Summary\n\\*\\*bold claim\\*\\*',
    );
  });

  it('falls back when report summaries are blank after trimming', () => {
    const report = buildResearchMarkdownReport({
      query: 'Blank summary safety',
      summary: '  \n  ',
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

    expect(report).toContain('## Summary\n\n(No provider summary.)\n\n## Key Findings');
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

  it('escapes provider and source metadata fields', () => {
    const report = buildResearchMarkdownReport({
      query: 'Metadata safety',
      summary: 'Metadata should stay in metadata fields.',
      provider: 'tavily\n## Injected Provider',
      depth: 'deep',
      topic: 'news',
      country: 'KR\n## Injected Country',
      timeRange: 'week',
      startDate: '2026-06-01\n## Injected Start',
      endDate: '2026-06-02\n## Injected End',
      includeDomains: ['example.com\n## Injected Include'],
      excludeDomains: ['bad.example\n## Injected Exclude'],
      selectedParameters: {
        topic: 'finance',
        searchDepth: 'advanced\n## Injected Search Depth',
      },
      warnings: ['> injected warning'],
      requestId: 'req]\n## Injected Request',
      fetchedAt: Date.UTC(2026, 5, 1),
      sources: [
        {
          title: 'Source',
          url: 'https://example.com/source',
          snippet: 'Evidence.',
          publishedAt: '2026-06-01\n## Injected Date',
          provider: 'tavily',
        },
      ],
    });

    expect(report).not.toContain('\n## Injected Provider');
    expect(report).not.toContain('\n## Injected Country');
    expect(report).not.toContain('\n## Injected Start');
    expect(report).not.toContain('\n## Injected End');
    expect(report).not.toContain('\n## Injected Include');
    expect(report).not.toContain('\n## Injected Exclude');
    expect(report).not.toContain('\n## Injected Search Depth');
    expect(report).not.toContain('\n## Injected Request');
    expect(report).not.toContain('\n## Injected Date');
    expect(report).not.toContain('\n> injected warning');
    expect(report).toContain('- Provider: tavily \\#\\# Injected Provider');
    expect(report).toContain('- Country: KR \\#\\# Injected Country');
    expect(report).toContain('- Start date: 2026-06-01 \\#\\# Injected Start');
    expect(report).toContain('- End date: 2026-06-02 \\#\\# Injected End');
    expect(report).toContain(
      '- Include domains: example.com \\#\\# Injected Include',
    );
    expect(report).toContain(
      '- Exclude domains: bad.example \\#\\# Injected Exclude',
    );
    expect(report).toContain('- Selected topic: finance');
    expect(report).toContain('- \\> injected warning');
    expect(report).toContain(
      '- Selected search depth: advanced \\#\\# Injected Search Depth',
    );
    expect(report).toContain('- Request ID: req\\] \\#\\# Injected Request');
    expect(report).toContain(
      '(example.com; published 2026-06-01 \\#\\# Injected Date)',
    );
  });
});
