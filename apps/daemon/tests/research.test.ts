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
    });
    const [, init] = fetchMock.mock.calls[0] as [FetchInput, FetchInit];
    const body = JSON.parse(String(init!.body));
    expect(body).toMatchObject({
      query: 'EV market 2025 trends',
      search_depth: 'basic',
      max_results: 20,
      include_answer: true,
      include_raw_content: false,
    });
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
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body).toMatchObject({
      start_date: '2026-05-01',
      end_date: '2026-05-31',
    });
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
});
