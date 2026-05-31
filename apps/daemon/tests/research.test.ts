import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { searchResearch, ResearchError } from '../src/research/index.js';

const TAVILY_ENV_KEYS = ['OD_TAVILY_API_KEY', 'TAVILY_API_KEY'];
type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

describe('research search', () => {
  const originalEnv = Object.fromEntries(
    TAVILY_ENV_KEYS.map((key) => [key, process.env[key]]),
  );
  let projectRoot: string | null = null;

  afterEach(async () => {
    vi.unstubAllGlobals();
    for (const key of TAVILY_ENV_KEYS) {
      if (originalEnv[key] == null) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    const dir = projectRoot;
    projectRoot = null;
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function tempProjectRoot() {
    projectRoot = await mkdtemp(path.join(tmpdir(), 'od-research-project-'));
    return projectRoot;
  }

  it('requires a Tavily API key', async () => {
    for (const key of TAVILY_ENV_KEYS) delete process.env[key];

    await expect(
      searchResearch({ projectRoot: await tempProjectRoot(), query: 'EV trends' }),
    ).rejects.toMatchObject({
      code: 'TAVILY_API_KEY_MISSING',
      status: 400,
    } satisfies Partial<ResearchError>);
  });

  it('uses shallow Tavily search and normalizes JSON findings', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'EV sales are growing.',
          request_id: 'req-ev-123',
          response_time: '1.67',
          usage: { credits: 1 },
          results: [
            {
              title: 'EV report',
              url: 'https://example.com/ev',
              content: 'EV adoption increased in 2025.',
              score: 0.91,
              published_date: '2025-05-01',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'EV market 2025 trends',
      maxSources: 50,
    });

    expect(findings).toMatchObject({
      query: 'EV market 2025 trends',
      summary: 'EV sales are growing.',
      provider: 'tavily',
      depth: 'shallow',
      usage: { credits: 1 },
      requestId: 'req-ev-123',
      responseTime: 1.67,
      sources: [
        {
          title: 'EV report',
          url: 'https://example.com/ev',
          snippet: 'EV adoption increased in 2025.',
          provider: 'tavily',
          score: 0.91,
          publishedAt: '2025-05-01',
        },
      ],
      warnings: ['Clamped maxSources to provider limit 20.'],
    });
    const [, init] = fetchMock.mock.calls[0] as [FetchInput, FetchInit];
    const body = JSON.parse(String(init!.body));
    expect(body).toMatchObject({
      query: 'EV market 2025 trends',
      search_depth: 'basic',
      max_results: 20,
      include_answer: true,
      include_raw_content: false,
      include_usage: true,
    });
  });

  it('drops duplicate and non-web source URLs before citation output', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Deduped source summary.',
          results: [
            {
              title: 'Primary source',
              url: 'https://example.com/source#section-a',
              content: 'Primary source content.',
            },
            {
              title: 'Duplicate anchor',
              url: 'https://example.com/source#section-b',
              content: 'Duplicate source content.',
            },
            {
              title: 'Unsafe source',
              url: 'javascript:alert(1)',
              content: 'Unsafe source content.',
            },
            {
              title: 'Second source',
              url: 'http://example.org/report',
              content: 'Second source content.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design source quality',
    });

    expect(findings.sources).toEqual([
      {
        title: 'Primary source',
        url: 'https://example.com/source',
        snippet: 'Primary source content.',
        provider: 'tavily',
      },
      {
        title: 'Second source',
        url: 'http://example.org/report',
        snippet: 'Second source content.',
        provider: 'tavily',
      },
    ]);
  });

  it('maps medium and deep depth requests to advanced Tavily search', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Detailed research summary.',
          results: [
            {
              title: 'Research report',
              url: 'https://example.com/research',
              content: 'Relevant chunks for the research request.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const medium = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'AI design tools product research',
      depth: 'medium',
    });
    const deep = await searchResearch({
      projectRoot: projectRoot!,
      query: 'AI design tools product research',
      depth: 'deep',
    });

    expect(medium.depth).toBe('medium');
    expect(deep.depth).toBe('deep');

    const mediumBody = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(mediumBody).toMatchObject({
      search_depth: 'advanced',
      max_results: 12,
      include_answer: true,
      chunks_per_source: 2,
    });

    const deepBody = JSON.parse(
      String((fetchMock.mock.calls[1] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(deepBody).toMatchObject({
      search_depth: 'advanced',
      max_results: 20,
      include_answer: 'advanced',
      chunks_per_source: 3,
    });
  });

  it('forwards topic and time range freshness filters to Tavily', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Recent product news summary.',
          results: [
            {
              title: 'Product update',
              url: 'https://example.com/news',
              content: 'A recent product announcement.',
              published_date: '2026-05-30',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design product news',
      topic: 'news',
      timeRange: 'week',
    });

    expect(findings).toMatchObject({
      depth: 'shallow',
      topic: 'news',
      timeRange: 'week',
      sources: [{ publishedAt: '2026-05-30' }],
    });
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body).toMatchObject({
      search_depth: 'basic',
      topic: 'news',
      time_range: 'week',
      max_results: 5,
    });
  });

  it('forwards country boosts only for general searches', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Regional product summary.',
          results: [
            {
              title: 'Regional source',
              url: 'https://example.kr/product',
              content: 'Korean market product coverage.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const general = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design competitors',
      country: 'kr',
    });
    const news = await searchResearch({
      projectRoot: projectRoot!,
      query: 'Open Design competitors',
      topic: 'news',
      country: 'kr',
    });

    expect(general.country).toBe('south korea');
    expect(news.country).toBeUndefined();
    const generalBody = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    const newsBody = JSON.parse(
      String((fetchMock.mock.calls[1] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(generalBody).toMatchObject({ country: 'south korea' });
    expect(newsBody).toMatchObject({ topic: 'news' });
    expect(newsBody).not.toHaveProperty('country');
  });

  it('returns visual image evidence only when requested', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Visual product summary.',
          images: [
            {
              url: 'https://images.example.com/product.jpg',
              description: 'A product interface reference.',
            },
            'https://images.example.com/moodboard.png',
            'not-a-url',
            'https://images.example.com/product.jpg',
          ],
          results: [
            {
              title: 'Visual source',
              url: 'https://example.com/visual',
              content: 'Visual design coverage.',
              images: [
                {
                  url: 'https://images.example.com/source-interface.png',
                  description: 'A source-level interface reference.',
                },
                'https://images.example.com/source-mood.png',
                'ftp://images.example.com/invalid.png',
                'https://images.example.com/source-interface.png',
              ],
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const plain = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design product visuals',
    });
    const visual = await searchResearch({
      projectRoot: projectRoot!,
      query: 'Open Design product visuals',
      includeImages: true,
    });

    expect(plain.includeImages).toBeUndefined();
    expect(plain.images).toBeUndefined();
    expect(plain.sources[0]?.images).toBeUndefined();
    expect(visual.includeImages).toBe(true);
    expect(visual.images).toEqual([
      {
        url: 'https://images.example.com/product.jpg',
        description: 'A product interface reference.',
        provider: 'tavily',
      },
      {
        url: 'https://images.example.com/moodboard.png',
        provider: 'tavily',
      },
    ]);
    expect(visual.sources[0]?.images).toEqual([
      {
        url: 'https://images.example.com/source-interface.png',
        description: 'A source-level interface reference.',
        provider: 'tavily',
      },
      {
        url: 'https://images.example.com/source-mood.png',
        provider: 'tavily',
      },
    ]);
    const plainBody = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    const visualBody = JSON.parse(
      String((fetchMock.mock.calls[1] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(plainBody).not.toHaveProperty('include_images');
    expect(visualBody).toMatchObject({
      include_images: true,
      include_image_descriptions: true,
    });
  });

  it('requests and returns source favicons when available', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Source identity summary.',
          results: [
            {
              title: 'Source with favicon',
              url: 'https://example.com/source',
              content: 'Research result.',
              favicon: 'https://example.com/favicon.ico',
            },
            {
              title: 'Source with invalid favicon',
              url: 'https://example.org/source',
              content: 'Research result.',
              favicon: 'data:image/png;base64,abc',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design source identity',
    });

    expect(findings.sources[0]?.favicon).toBe('https://example.com/favicon.ico');
    expect(findings.sources[1]?.favicon).toBeUndefined();
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body).toMatchObject({ include_favicon: true });
  });

  it('returns bounded raw source content only when requested', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const longRawContent = `${'Detailed evidence. '.repeat(400)}tail`;
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Raw evidence summary.',
          results: [
            {
              title: 'Raw source',
              url: 'https://example.com/raw',
              content: 'Short snippet.',
              raw_content: longRawContent,
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const plain = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design evidence',
    });
    const raw = await searchResearch({
      projectRoot: projectRoot!,
      query: 'Open Design evidence',
      includeRawContent: true,
    });

    expect(plain.includeRawContent).toBeUndefined();
    expect(plain.sources[0]).not.toHaveProperty('rawContent');
    expect(raw.includeRawContent).toBe(true);
    expect(raw.sources[0]?.rawContent).toBe(longRawContent.slice(0, 4000));
    const plainBody = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    const rawBody = JSON.parse(
      String((fetchMock.mock.calls[1] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(plainBody).toMatchObject({ include_raw_content: false });
    expect(rawBody).toMatchObject({ include_raw_content: 'markdown' });
  });

  it('returns provider-selected parameters only when automatic tuning is requested', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Auto-tuned research summary.',
          auto_parameters: { topic: 'news', search_depth: 'advanced' },
          results: [
            {
              title: 'Auto tuned source',
              url: 'https://example.com/auto',
              content: 'A source selected by auto parameters.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const plain = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design market update',
    });
    const auto = await searchResearch({
      projectRoot: projectRoot!,
      query: 'Open Design market update',
      autoParameters: true,
    });

    expect(plain.autoParameters).toBeUndefined();
    expect(plain.selectedParameters).toBeUndefined();
    expect(auto.autoParameters).toBe(true);
    expect(auto.selectedParameters).toEqual({
      topic: 'news',
      searchDepth: 'advanced',
    });
    const plainBody = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    const autoBody = JSON.parse(
      String((fetchMock.mock.calls[1] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(plainBody).not.toHaveProperty('auto_parameters');
    expect(autoBody).toMatchObject({
      auto_parameters: true,
      include_answer: true,
      include_raw_content: false,
      max_results: 5,
    });
  });

  it('forwards valid exact date range filters to Tavily', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'May product coverage summary.',
          results: [
            {
              title: 'May update',
              url: 'https://example.com/may-update',
              content: 'Product coverage published during May.',
              published_date: '2026-05-15',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design May updates',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    });

    expect(findings).toMatchObject({
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      sources: [{ publishedAt: '2026-05-15' }],
    });
    expect(findings.warnings).toBeUndefined();
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body).toMatchObject({
      start_date: '2026-05-01',
      end_date: '2026-05-31',
    });
  });

  it('rejects reversed exact date ranges before Tavily is called', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      searchResearch({
        projectRoot: await tempProjectRoot(),
        query: 'Open Design May updates',
        startDate: '2026-05-31',
        endDate: '2026-05-01',
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_DATE_RANGE',
      status: 400,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not forward invalid exact date filters to Tavily', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Fallback summary.',
          results: [
            {
              title: 'Result',
              url: 'https://example.com/result',
              content: 'Search result.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design updates',
      startDate: '2026-99-01',
      endDate: 'not-a-date',
    });

    expect(findings.startDate).toBeUndefined();
    expect(findings.endDate).toBeUndefined();
    expect(findings.warnings).toEqual([
      'Ignored invalid startDate; expected YYYY-MM-DD.',
      'Ignored invalid endDate; expected YYYY-MM-DD.',
    ]);
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body).not.toHaveProperty('start_date');
    expect(body).not.toHaveProperty('end_date');
  });

  it('forwards normalized domain filters to Tavily', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Official-source summary.',
          results: [
            {
              title: 'Official docs',
              url: 'https://docs.openai.com/example',
              content: 'Official documentation result.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'OpenAI platform release notes',
      includeDomains: [
        'OpenAI.com',
        'https://docs.openai.com/platform',
        'not a domain',
        'openai.com',
      ],
      excludeDomains: ['Reddit.com', 'localhost'],
    });

    expect(findings).toMatchObject({
      includeDomains: ['openai.com', 'docs.openai.com'],
      excludeDomains: ['reddit.com'],
      warnings: [
        'Ignored invalid, duplicate, or excess includeDomains entries.',
        'Ignored invalid, duplicate, or excess excludeDomains entries.',
      ],
    });
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body).toMatchObject({
      include_domains: ['openai.com', 'docs.openai.com'],
      exclude_domains: ['reddit.com'],
    });
  });

  it('forwards exact match only when requested', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Exact phrase summary.',
          results: [
            {
              title: 'Exact match result',
              url: 'https://example.com/exact',
              content: 'A result that contains the exact quoted phrase.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: '"Open Design" release notes',
      exactMatch: true,
    });
    await searchResearch({
      projectRoot: projectRoot!,
      query: 'Open Design release notes',
    });

    expect(findings.exactMatch).toBe(true);
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body).toMatchObject({ exact_match: true });
    const defaultBody = JSON.parse(
      String((fetchMock.mock.calls[1] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(defaultBody).not.toHaveProperty('exact_match');
  });

  it('preserves relevance scores and applies requested score filters', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Filtered relevance summary.',
          results: [
            {
              title: 'Strong result',
              url: 'https://example.com/strong',
              content: 'High relevance result.',
              score: 0.86,
            },
            {
              title: 'Weak result',
              url: 'https://example.com/weak',
              content: 'Low relevance result.',
              score: 0.42,
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design evidence quality',
      minScore: 0.5,
    });

    expect(findings).toMatchObject({
      minScore: 0.5,
      sources: [
        {
          title: 'Strong result',
          url: 'https://example.com/strong',
          score: 0.86,
        },
      ],
    });
    expect(findings.sources).toHaveLength(1);
  });

  it('warns when numeric controls are clamped to supported ranges', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Clamped control summary.',
          results: [
            {
              title: 'Perfect result',
              url: 'https://example.com/perfect',
              content: 'High relevance result.',
              score: 1,
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design evidence quality',
      minScore: 2,
      maxSources: 50,
    });

    expect(findings).toMatchObject({
      minScore: 1,
      warnings: [
        'Clamped minScore to the supported range 0..1.',
        'Clamped maxSources to provider limit 20.',
      ],
    });
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body).toMatchObject({ max_results: 20 });
  });

  it('explains when minScore filters all provider sources', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Low relevance summary.',
          results: [
            {
              title: 'Weak result',
              url: 'https://example.com/weak',
              content: 'Low relevance result.',
              score: 0.42,
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      searchResearch({
        projectRoot: await tempProjectRoot(),
        query: 'Open Design evidence quality',
        minScore: 0.8,
      }),
    ).rejects.toMatchObject({
      code: 'NO_RESEARCH_SOURCES',
      message: 'no sources met minScore 0.8; provider returned 1 source',
      status: 404,
    });
  });
});
