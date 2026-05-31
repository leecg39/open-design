import { mkdtemp, rm } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { searchResearch, ResearchError } from '../src/research/index.js';
import { tavilySearch } from '../src/research/tavily.js';

const TAVILY_ENV_KEYS = ['OD_TAVILY_API_KEY', 'TAVILY_API_KEY'];
type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];
type StartedServer = { server: http.Server; url: string };

describe('research search', () => {
  const originalEnv = Object.fromEntries(
    TAVILY_ENV_KEYS.map((key) => [key, process.env[key]]),
  );
  let projectRoot: string | null = null;

  afterEach(async () => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
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

  function closeServer(server: http.Server): Promise<void> {
    return new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }

  async function waitFor(predicate: () => boolean, timeoutMs: number) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() <= deadline) {
      if (predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error('waitFor: predicate did not become true');
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

  it('rejects blank direct Tavily API keys before provider fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      tavilySearch({
        apiKey: '   ',
        query: 'Open Design key validation',
      }),
    ).rejects.toMatchObject({
      message: 'Tavily API key is not configured',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects blank direct Tavily queries before provider fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      tavilySearch({
        apiKey: 'tvly-test',
        query: '   ',
      }),
    ).rejects.toMatchObject({
      message: 'Tavily query is required',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('bounds long direct Tavily queries before provider fetch', async () => {
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Bounded direct query summary.',
          results: [
            {
              title: 'Bounded direct query source',
              url: 'https://example.com/bounded-direct-query',
              content: 'Direct helper query text should be bounded.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const longQuery = ` ${'Open Design '.repeat(120)} `;

    await tavilySearch({
      apiKey: 'tvly-test',
      query: longQuery,
    });

    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body.query).toHaveLength(1000);
    expect(body.query).toBe(longQuery.trim().slice(0, 1000));
  });

  it('warns when long queries are truncated before provider search', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Truncated query summary.',
          results: [
            {
              title: 'Truncated query source',
              url: 'https://example.com/truncated-query',
              content: 'Result for the effective query.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const longQuery = ` ${'Open Design '.repeat(120)} `;

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: longQuery,
    });

    expect(findings.query).toHaveLength(1000);
    expect(findings.warnings).toEqual([
      'Truncated query to 1000 characters.',
    ]);
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body.query).toBe(findings.query);
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
      maxSources: 20,
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

  it('omits blank provider numeric metadata instead of treating it as zero', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Blank numeric metadata summary.',
          response_time: '   ',
          usage: { credits: '' },
          results: [
            {
              title: 'Blank numeric metadata source',
              url: 'https://example.com/blank-numeric-metadata',
              content: 'Blank numeric metadata should be omitted.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design blank numeric metadata',
    });

    expect(findings.responseTime).toBeUndefined();
    expect(findings.usage).toBeUndefined();
  });

  it('bounds provider answers before returning findings', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const longAnswer = `Detailed provider answer\n${'summary detail '.repeat(400)}`;
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: longAnswer,
          results: [
            {
              title: 'Answer source',
              url: 'https://example.com/answer-bound',
              content: 'Provider answer should be bounded.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design provider answer quality',
    });

    expect(findings.summary).toHaveLength(4000);
    expect(findings.summary).toBe(longAnswer.trim().slice(0, 4000));
    expect(findings.summary).toContain('\n');
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
              url: 'https://user:secret@example.com/source#section-a',
              content: 'Primary source content.',
            },
            {
              title: 'Duplicate anchor',
              url: 'https://example.com/source#section-b',
              content: 'Duplicate source content.',
            },
            {
              title: 'Duplicate trailing slash',
              url: 'https://example.com/source/',
              content: 'Duplicate source content.',
            },
            {
              title: 'Duplicate tracking query',
              url: 'https://example.com/source?utm_source=newsletter&fbclid=abc',
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
    expect(findings.discardedSourceCount).toBe(4);
  });

  it('dedupes source URLs with reordered query parameters', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Query-order dedupe summary.',
          results: [
            {
              title: 'Primary query source',
              url: 'https://example.com/source?b=2&a=1',
              content: 'Primary source content.',
            },
            {
              title: 'Reordered duplicate query source',
              url: 'https://example.com/source?a=1&b=2',
              content: 'Duplicate source content.',
            },
            {
              title: 'Distinct query source',
              url: 'https://example.com/source?a=1&b=3',
              content: 'Distinct source content.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design query order source quality',
    });

    expect(findings.sources.map((source) => source.url)).toEqual([
      'https://example.com/source?a=1&b=2',
      'https://example.com/source?a=1&b=3',
    ]);
    expect(findings.discardedSourceCount).toBe(1);
  });

  it('discards malformed provider result entries without dropping valid sources', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Malformed results summary.',
          results: [
            null,
            'not an object',
            {
              title: 'Valid source',
              url: 'https://example.com/valid',
              content: 'Valid source content.',
            },
            42,
            {
              title: 'Invalid URL source',
              url: 'ftp://example.com/file',
              content: 'Invalid URL content.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design malformed provider results',
    });

    expect(findings.sources).toEqual([
      {
        title: 'Valid source',
        url: 'https://example.com/valid',
        snippet: 'Valid source content.',
        provider: 'tavily',
      },
    ]);
    expect(findings.discardedSourceCount).toBe(4);
  });

  it('bounds and compacts provider source titles', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const longTitle = `Verbose source title\n${'repeated title '.repeat(40)}`;
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Bounded title summary.',
          results: [
            {
              title: longTitle,
              url: 'https://example.com/bounded-title',
              content: 'Source title should be compact and bounded.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design source title quality',
    });

    expect(findings.sources[0]?.title).not.toContain('\n');
    expect(findings.sources[0]?.title).toHaveLength(300);
    expect(findings.sources[0]?.title).toBe(
      longTitle.replace(/\s+/g, ' ').trim().slice(0, 300),
    );
  });

  it('bounds source URL fallback titles when provider titles are blank', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const longUrl = `https://example.com/${'long-url-segment-'.repeat(25)}source`;
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Bounded fallback title summary.',
          results: [
            {
              title: '  ',
              url: longUrl,
              content: 'A blank title should fall back to a bounded URL title.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design source fallback title quality',
    });

    expect(findings.sources[0]?.url).toBe(longUrl);
    expect(findings.sources[0]?.title).toHaveLength(300);
    expect(findings.sources[0]?.title).toBe(longUrl.slice(0, 300));
  });

  it('bounds and compacts provider source snippets', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const longSnippet = `First evidence line\n${'repeated evidence '.repeat(80)}`;
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Bounded snippet summary.',
          results: [
            {
              title: 'Snippet source',
              url: 'https://example.com/bounded-snippet',
              content: longSnippet,
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design source snippet quality',
    });

    expect(findings.sources[0]?.snippet).not.toContain('\n');
    expect(findings.sources[0]?.snippet).toHaveLength(800);
    expect(findings.sources[0]?.snippet).toBe(
      longSnippet.replace(/\s+/g, ' ').trim().slice(0, 800),
    );
  });

  it('bounds and compacts provider published dates', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const longDate = `2026-06-01\n${'provider date metadata '.repeat(10)}`;
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Bounded date metadata summary.',
          results: [
            {
              title: 'Date source',
              url: 'https://example.com/bounded-date',
              content: 'Source date should be compact and bounded.',
              published_date: longDate,
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design source date quality',
    });

    expect(findings.sources[0]?.publishedAt).not.toContain('\n');
    expect(findings.sources[0]?.publishedAt).toHaveLength(100);
    expect(findings.sources[0]?.publishedAt).toBe(
      longDate.replace(/\s+/g, ' ').trim().slice(0, 100),
    );
  });

  it('explains when all provider results are discarded by source URL normalization', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Discarded source summary.',
          results: [
            {
              title: 'Unsafe source',
              url: 'javascript:alert(1)',
              content: 'Unsafe source content.',
            },
            {
              title: 'Missing URL source',
              content: 'Missing URL source content.',
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
        query: 'Open Design unusable sources',
      }),
    ).rejects.toMatchObject({
      code: 'NO_RESEARCH_SOURCES',
      message: 'no usable source URLs found; provider returned 2 discarded results',
      status: 404,
    });
  });

  it('respects research signals aborted before provider fetch starts', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const ctrl = new AbortController();
    ctrl.abort();
    const fetchMock = vi.fn(async (_input: FetchInput, init?: FetchInit) => {
      if ((init?.signal as AbortSignal | undefined)?.aborted) {
        throw new Error('aborted before network');
      }
      return new Response(
        JSON.stringify({
          answer: 'Unexpected success.',
          results: [
            {
              title: 'Unexpected source',
              url: 'https://example.com/unexpected',
              content: 'This request should have been aborted.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      searchResearch({
        projectRoot: await tempProjectRoot(),
        query: 'Open Design cancelled research',
        signal: ctrl.signal,
      }),
    ).rejects.toMatchObject({
      code: 'RESEARCH_PROVIDER_FAILED',
      message: 'Tavily request aborted',
      status: 502,
    });
  });

  it('reports provider timeouts explicitly', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_input: FetchInput, init?: FetchInit) =>
        new Promise<Response>((_resolve, reject) => {
          (init?.signal as AbortSignal | undefined)?.addEventListener(
            'abort',
            () => reject(new Error('aborted by timeout')),
            { once: true },
          );
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const pending = tavilySearch({
      apiKey: 'tvly-test',
      query: 'Open Design timeout research',
    });
    const assertion = expect(pending).rejects.toMatchObject({
      message: 'Tavily request timed out after 30000ms',
    });
    await vi.advanceTimersByTimeAsync(30_000);
    await assertion;
  });

  it('compacts Tavily network error messages before surfacing them', async () => {
    const noisyMessage = `  DNS lookup failed\n${'temporary outage '.repeat(30)}`;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error(noisyMessage);
      }),
    );

    await expect(
      tavilySearch({
        apiKey: 'tvly-test',
        query: 'Open Design provider network error surface',
      }),
    ).rejects.toMatchObject({
      message: `Tavily request failed: ${noisyMessage
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200)}`,
    });
  });

  it('reports invalid Tavily JSON responses clearly', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
        new Response('not json', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );

    await expect(
      searchResearch({
        projectRoot: await tempProjectRoot(),
        query: 'Open Design invalid provider JSON',
      }),
    ).rejects.toMatchObject({
      code: 'RESEARCH_PROVIDER_FAILED',
      message: 'Tavily returned invalid JSON',
      status: 502,
    });
  });

  it('reports malformed Tavily results lists as provider failures', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
        new Response(
          JSON.stringify({
            answer: 'Malformed results payload.',
            results: { title: 'not an array' },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      ),
    );

    await expect(
      searchResearch({
        projectRoot: await tempProjectRoot(),
        query: 'Open Design malformed provider results list',
      }),
    ).rejects.toMatchObject({
      code: 'RESEARCH_PROVIDER_FAILED',
      message: 'Tavily returned invalid results list',
      status: 502,
    });
  });

  it('compacts Tavily error response bodies before surfacing them', async () => {
    const noisyBody = `  Too many requests\n${'retry later '.repeat(40)}`;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
        new Response(noisyBody, {
          status: 429,
          headers: { 'content-type': 'text/plain' },
        }),
      ),
    );

    await expect(
      tavilySearch({
        apiKey: 'tvly-test',
        query: 'Open Design provider error surface',
      }),
    ).rejects.toMatchObject({
      message: `Tavily 429: ${noisyBody.replace(/\s+/g, ' ').trim().slice(0, 200)}`,
      status: 429,
    });
  });

  it('normalizes direct Tavily maxResults to a positive integer', async () => {
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Normalized max results summary.',
          results: [
            {
              title: 'Normalized source',
              url: 'https://example.com/normalized',
              content: 'Direct helper max results should be safe.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await tavilySearch({
      apiKey: 'tvly-test',
      query: 'Open Design direct Tavily max results',
      maxResults: 0.5,
    });

    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body).toMatchObject({ max_results: 1 });
  });

  it('falls back to the default Tavily base URL when direct baseUrl is blank', async () => {
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Default base URL summary.',
          results: [
            {
              title: 'Default base source',
              url: 'https://example.com/default-base',
              content: 'Blank base URL should not produce a malformed fetch URL.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await tavilySearch({
      apiKey: 'tvly-test',
      baseUrl: '   ',
      query: 'Open Design direct Tavily base URL',
    });

    expect((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[0]).toBe(
      'https://api.tavily.com/search',
    );
  });

  it('rejects non-http direct Tavily base URLs before provider fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      tavilySearch({
        apiKey: 'tvly-test',
        baseUrl: 'ftp://example.com',
        query: 'Open Design direct Tavily base URL',
      }),
    ).rejects.toMatchObject({
      message: 'Tavily base URL must use http or https',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects direct Tavily base URL credentials before provider fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      tavilySearch({
        apiKey: 'tvly-test',
        baseUrl: 'https://user:pass@example.com',
        query: 'Open Design direct Tavily base URL',
      }),
    ).rejects.toMatchObject({
      message: 'Tavily base URL must not include credentials',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects private-network direct Tavily base URLs before provider fetch', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      tavilySearch({
        apiKey: 'tvly-test',
        baseUrl: 'http://192.168.0.10',
        query: 'Open Design direct Tavily base URL',
      }),
    ).rejects.toMatchObject({
      message: 'Tavily base URL must not point to an internal network host',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('omits blank direct Tavily string filters before provider fetch', async () => {
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Blank filter summary.',
          results: [
            {
              title: 'Blank filter source',
              url: 'https://example.com/blank-filter',
              content: 'Blank string filters should not reach Tavily.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await tavilySearch({
      apiKey: 'tvly-test',
      query: 'Open Design direct Tavily filters',
      country: '   ',
      startDate: '  ',
      endDate: '\n\t',
    });

    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body).not.toHaveProperty('country');
    expect(body).not.toHaveProperty('start_date');
    expect(body).not.toHaveProperty('end_date');
  });

  it('cleans direct Tavily domain filters before provider fetch', async () => {
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Domain filter summary.',
          results: [
            {
              title: 'Domain filter source',
              url: 'https://example.com/domain-filter',
              content: 'Domain filters should be clean before Tavily.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await tavilySearch({
      apiKey: 'tvly-test',
      query: 'Open Design direct Tavily domains',
      includeDomains: [
        ' Example.com ',
        'https://Docs.Example.com/platform?utm=1',
        'example.com:443',
        ' ',
        'OpenAI.com',
        'not a domain',
      ],
      excludeDomains: [
        ' https://News.Example.com/story ',
        'news.example.com',
        '\t',
      ],
    });

    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body.include_domains).toEqual([
      'example.com',
      'docs.example.com',
      'openai.com',
    ]);
    expect(body.exclude_domains).toEqual(['news.example.com']);
  });

  it('removes overlapping direct Tavily exclude domains before provider fetch', async () => {
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Domain overlap summary.',
          results: [
            {
              title: 'Domain overlap source',
              url: 'https://example.com/domain-overlap',
              content: 'Overlapping domain filters should be deterministic.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await tavilySearch({
      apiKey: 'tvly-test',
      query: 'Open Design direct Tavily domain overlap',
      includeDomains: ['Example.com', 'openai.com'],
      excludeDomains: ['example.com', 'news.example.com'],
    });

    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body.include_domains).toEqual(['example.com', 'openai.com']);
    expect(body.exclude_domains).toEqual(['news.example.com']);
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
    expect(findings.warnings).toBeUndefined();
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

  it('warns when enum-like research controls are ignored', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Fallback enum summary.',
          results: [
            {
              title: 'Fallback source',
              url: 'https://example.com/fallback',
              content: 'Fallback search content.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design ignored filters',
      depth: 'full',
      topic: 'blogs',
      timeRange: 'quarter',
      country: 'south korea!',
    } as any);

    expect(findings).toMatchObject({
      depth: 'shallow',
      warnings: [
        'Ignored invalid depth; expected shallow, medium, or deep.',
        'Ignored invalid topic; expected general, news, or finance.',
        'Ignored invalid country boost.',
        'Ignored invalid timeRange; expected day, week, month, or year.',
      ],
    });
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body).toMatchObject({ search_depth: 'basic' });
    expect(body).not.toHaveProperty('topic');
    expect(body).not.toHaveProperty('time_range');
    expect(body).not.toHaveProperty('country');
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
      country: '"South Korea"',
    });
    const news = await searchResearch({
      projectRoot: projectRoot!,
      query: 'Open Design competitors',
      topic: 'news',
      country: 'kr',
    });

    expect(general.country).toBe('south korea');
    expect(general.warnings).toBeUndefined();
    expect(news.country).toBeUndefined();
    expect(news.warnings).toEqual([
      'Ignored country boost because topic news/finance does not support it.',
    ]);
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
              url: 'https://user:secret@images.example.com/product.jpg#hero',
              description: 'A product interface reference.',
            },
            'https://images.example.com/product.jpg?utm_source=newsletter&fbclid=abc',
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
                  url:
                    'https://user:secret@images.example.com/source-interface.png#screen',
                  description: 'A source-level interface reference.',
                },
                'https://images.example.com/source-interface.png?utm_medium=email',
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

  it('bounds and compacts provider image descriptions', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const longDescription = `Image evidence line\n${'visual description '.repeat(40)}`;
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Bounded image description summary.',
          images: [
            {
              url: 'https://images.example.com/visual.png',
              description: longDescription,
            },
          ],
          results: [
            {
              title: 'Visual source',
              url: 'https://example.com/visual-description',
              content: 'Visual description source.',
              images: [
                {
                  url: 'https://images.example.com/source-visual.png',
                  description: longDescription,
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design image description quality',
      includeImages: true,
    });

    const expected = longDescription.replace(/\s+/g, ' ').trim().slice(0, 500);
    expect(findings.images?.[0]?.description).not.toContain('\n');
    expect(findings.images?.[0]?.description).toHaveLength(500);
    expect(findings.images?.[0]?.description).toBe(expected);
    expect(findings.sources[0]?.images?.[0]?.description).toBe(expected);
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
    expect(plain.sources[0]).not.toHaveProperty('rawContentTruncated');
    expect(raw.includeRawContent).toBe(true);
    expect(raw.sources[0]?.rawContent).toBe(longRawContent.slice(0, 4000));
    expect(raw.sources[0]?.rawContentTruncated).toBe(true);
    const plainBody = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    const rawBody = JSON.parse(
      String((fetchMock.mock.calls[1] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(plainBody).toMatchObject({ include_raw_content: false });
    expect(rawBody).toMatchObject({ include_raw_content: 'markdown' });
  });

  it('uses raw content excerpts in fallback summaries when snippets are empty', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          results: [
            {
              title: 'Raw-only source',
              url: 'https://example.com/raw-only',
              content: '',
              raw_content: 'Detailed source evidence for a raw-only page.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design raw fallback',
      includeRawContent: true,
    });

    expect(findings.summary).toContain(
      '[1] Raw-only source [raw excerpt]: Detailed source evidence',
    );
  });

  it('uses source URLs in fallback summaries when excerpts are missing', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          results: [
            {
              title: 'URL-only source',
              url: 'https://example.com/url-only',
              content: '',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design URL fallback',
    });

    expect(findings.summary).toContain(
      '[1] URL-only source [url]: https://example.com/url-only',
    );
  });

  it('uses fallback summaries when provider answers are blank', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: '  \n  ',
          results: [
            {
              title: 'Blank answer source',
              url: 'https://example.com/blank-answer',
              content: 'Source snippet should backfill a blank provider answer.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design blank provider answer',
    });

    expect(findings.summary).toContain('(No provider summary; top snippets follow.)');
    expect(findings.summary).toContain(
      '[1] Blank answer source: Source snippet should backfill',
    );
  });

  it('keeps fallback summary source lines compact', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          results: [
            {
              title: 'Injected title\n## Fake Heading',
              url: 'https://example.com/compact-fallback',
              content: 'First line\n- fake list item',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design compact fallback',
    });

    expect(findings.summary).toContain(
      '[1] Injected title ## Fake Heading: First line - fake list item',
    );
    expect(findings.summary).not.toContain('\n## Fake Heading');
    expect(findings.summary).not.toContain('\n- fake list item');
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
    expect(autoBody).not.toHaveProperty('search_depth');
  });

  it('bounds and compacts provider diagnostics metadata', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const requestId = `req-line-one\n${'request diagnostics '.repeat(10)}`;
    const searchDepth = `advanced\n${'selected depth '.repeat(10)}`;
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Diagnostics metadata summary.',
          request_id: requestId,
          auto_parameters: { topic: 'news', search_depth: searchDepth },
          results: [
            {
              title: 'Diagnostics source',
              url: 'https://example.com/diagnostics',
              content: 'Diagnostics metadata source.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design diagnostics metadata quality',
      autoParameters: true,
    });

    expect(findings.requestId).not.toContain('\n');
    expect(findings.requestId).toHaveLength(120);
    expect(findings.requestId).toBe(
      requestId.replace(/\s+/g, ' ').trim().slice(0, 120),
    );
    expect(findings.selectedParameters?.searchDepth).not.toContain('\n');
    expect(findings.selectedParameters?.searchDepth).toHaveLength(40);
    expect(findings.selectedParameters?.searchDepth).toBe(
      searchDepth.replace(/\s+/g, ' ').trim().slice(0, 40),
    );
  });

  it('keeps explicit deep search depth when automatic tuning is also requested', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Explicit deep auto-tuned summary.',
          auto_parameters: { topic: 'general', search_depth: 'advanced' },
          results: [
            {
              title: 'Deep source',
              url: 'https://example.com/deep-auto',
              content: 'Deep source content.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design deep market scan',
      depth: 'deep',
      autoParameters: true,
    });

    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body).toMatchObject({
      auto_parameters: true,
      search_depth: 'advanced',
      include_answer: 'advanced',
      chunks_per_source: 3,
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

  it('prefers exact date filters over relative time range filters', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Exact temporal summary.',
          results: [
            {
              title: 'Exact temporal source',
              url: 'https://example.com/exact-temporal',
              content: 'Coverage from the exact requested range.',
              published_date: '2026-05-20',
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
      timeRange: 'week',
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    });

    expect(findings).toMatchObject({
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      warnings: [
        'Ignored timeRange because exact date filters were provided.',
      ],
    });
    expect(findings.timeRange).toBeUndefined();
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body).toMatchObject({
      start_date: '2026-05-01',
      end_date: '2026-05-31',
    });
    expect(body).not.toHaveProperty('time_range');
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

  it('removes exclude domain filters that conflict with includes', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Domain conflict summary.',
          results: [
            {
              title: 'Included source',
              url: 'https://example.com/source',
              content: 'Included source content.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design domain filters',
      includeDomains: ['example.com', 'docs.example.com'],
      excludeDomains: ['example.com', 'reddit.com'],
    });

    expect(findings).toMatchObject({
      includeDomains: ['example.com', 'docs.example.com'],
      excludeDomains: ['reddit.com'],
      warnings: [
        'Removed excludeDomains entries that also appear in includeDomains.',
      ],
    });
    const body = JSON.parse(
      String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
    );
    expect(body).toMatchObject({
      include_domains: ['example.com', 'docs.example.com'],
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
      filteredSourceCount: 1,
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

  it('preserves invalid API numeric controls for daemon warnings', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const realFetch = globalThis.fetch;
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'API warning summary.',
          results: [
            {
              title: 'Deep result',
              url: 'https://example.com/deep',
              content: 'Depth default should survive invalid API controls.',
              score: 0.73,
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { startServer } = await import('../src/server.js');
    const started = (await startServer({
      port: 0,
      returnServer: true,
    })) as StartedServer;

    try {
      const response = await realFetch(`${started.url}/api/research/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Open Design API validation',
          depth: 'deep',
          minScore: 'high',
          maxSources: 'many',
        }),
      });
      const findings = await response.json();

      expect(response.status).toBe(200);
      expect(findings).toMatchObject({
        depth: 'deep',
        maxSources: 20,
        warnings: [
          'Ignored invalid minScore; expected a number from 0 to 1.',
          'Ignored invalid maxSources; expected a positive number.',
        ],
      });
      expect(findings).not.toHaveProperty('minScore');
      const body = JSON.parse(
        String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
      );
      expect(body).toMatchObject({
        search_depth: 'advanced',
        max_results: 20,
      });
    } finally {
      await closeServer(started.server);
    }
  });

  it('preserves invalid API provider controls for daemon warnings', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const realFetch = globalThis.fetch;
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Provider warning summary.',
          results: [
            {
              title: 'Provider result',
              url: 'https://example.com/provider',
              content: 'Provider validation should be visible to callers.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { startServer } = await import('../src/server.js');
    const started = (await startServer({
      port: 0,
      returnServer: true,
    })) as StartedServer;

    try {
      const response = await realFetch(`${started.url}/api/research/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Open Design provider validation',
          providers: 'bing',
        }),
      });
      const findings = await response.json();

      expect(response.status).toBe(200);
      expect(findings).toMatchObject({
        provider: 'tavily',
        warnings: [
          'Ignored invalid providers; expected an array of provider ids.',
        ],
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      await closeServer(started.server);
    }
  });

  it('falls back to supported research provider preference entries', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Provider fallback summary.',
          results: [
            {
              title: 'Fallback provider result',
              url: 'https://example.com/provider-fallback',
              content: 'Tavily should be used when it appears later.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const findings = await searchResearch({
      projectRoot: await tempProjectRoot(),
      query: 'Open Design provider fallback',
      providers: ['bing', 'tavily'],
    });

    expect(findings).toMatchObject({
      provider: 'tavily',
      warnings: ['Ignored unsupported research providers: bing.'],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('preserves invalid API domain filter shapes for daemon warnings', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const realFetch = globalThis.fetch;
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Domain warning summary.',
          results: [
            {
              title: 'Domain result',
              url: 'https://example.com/domain',
              content: 'Domain validation should be visible to callers.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { startServer } = await import('../src/server.js');
    const started = (await startServer({
      port: 0,
      returnServer: true,
    })) as StartedServer;

    try {
      const response = await realFetch(`${started.url}/api/research/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Open Design domain validation',
          includeDomains: { domain: 'openai.com' },
          excludeDomains: 42,
        }),
      });
      const findings = await response.json();

      expect(response.status).toBe(200);
      expect(findings).toMatchObject({
        warnings: [
          'Ignored invalid includeDomains; expected an array or comma-separated string.',
          'Ignored invalid excludeDomains; expected an array or comma-separated string.',
        ],
      });
      const body = JSON.parse(
        String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
      );
      expect(body).not.toHaveProperty('include_domains');
      expect(body).not.toHaveProperty('exclude_domains');
    } finally {
      await closeServer(started.server);
    }
  });

  it('preserves invalid API boolean controls for daemon warnings', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const realFetch = globalThis.fetch;
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'Boolean warning summary.',
          results: [
            {
              title: 'Boolean result',
              url: 'https://example.com/boolean',
              content: 'Boolean validation should be visible to callers.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { startServer } = await import('../src/server.js');
    const started = (await startServer({
      port: 0,
      returnServer: true,
    })) as StartedServer;

    try {
      const response = await realFetch(`${started.url}/api/research/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Open Design boolean validation',
          exactMatch: 'true',
          includeImages: 'true',
          includeRawContent: 1,
          autoParameters: 'yes',
        }),
      });
      const findings = await response.json();

      expect(response.status).toBe(200);
      expect(findings).toMatchObject({
        warnings: [
          'Ignored invalid exactMatch; expected a boolean.',
          'Ignored invalid includeImages; expected a boolean.',
          'Ignored invalid includeRawContent; expected a boolean.',
          'Ignored invalid autoParameters; expected a boolean.',
        ],
      });
      const body = JSON.parse(
        String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
      );
      expect(body).not.toHaveProperty('exact_match');
      expect(body).not.toHaveProperty('include_images');
      expect(body).not.toHaveProperty('auto_parameters');
      expect(body).toMatchObject({ include_raw_content: false });
    } finally {
      await closeServer(started.server);
    }
  });

  it('returns a 400 research error for invalid API query shapes', async () => {
    const realFetch = globalThis.fetch;
    const { startServer } = await import('../src/server.js');
    const started = (await startServer({
      port: 0,
      returnServer: true,
    })) as StartedServer;

    try {
      const response = await realFetch(`${started.url}/api/research/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 42 }),
      });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body).toEqual({
        error: {
          code: 'QUERY_REQUIRED',
          message: 'query required',
        },
      });
    } finally {
      await closeServer(started.server);
    }
  });

  it('preserves invalid API string controls for daemon warnings', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const realFetch = globalThis.fetch;
    const fetchMock = vi.fn(async (_input: FetchInput, _init?: FetchInit) =>
      new Response(
        JSON.stringify({
          answer: 'String control warning summary.',
          results: [
            {
              title: 'String control result',
              url: 'https://example.com/string-controls',
              content: 'String control validation should be visible.',
            },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { startServer } = await import('../src/server.js');
    const started = (await startServer({
      port: 0,
      returnServer: true,
    })) as StartedServer;

    try {
      const response = await realFetch(`${started.url}/api/research/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: 'Open Design string control validation',
          depth: 123,
          topic: 7,
          country: ['kr'],
          timeRange: false,
          startDate: 20260531,
          endDate: { date: '2026-05-31' },
        }),
      });
      const findings = await response.json();

      expect(response.status).toBe(200);
      expect(findings).toMatchObject({
        depth: 'shallow',
        warnings: [
          'Ignored invalid depth; expected shallow, medium, or deep.',
          'Ignored invalid topic; expected general, news, or finance.',
          'Ignored invalid country boost.',
          'Ignored invalid timeRange; expected day, week, month, or year.',
          'Ignored invalid startDate; expected YYYY-MM-DD.',
          'Ignored invalid endDate; expected YYYY-MM-DD.',
        ],
      });
      const body = JSON.parse(
        String((fetchMock.mock.calls[0] as [FetchInput, FetchInit])[1]!.body),
      );
      expect(body).not.toHaveProperty('topic');
      expect(body).not.toHaveProperty('country');
      expect(body).not.toHaveProperty('time_range');
      expect(body).not.toHaveProperty('start_date');
      expect(body).not.toHaveProperty('end_date');
    } finally {
      await closeServer(started.server);
    }
  });

  it('aborts API research search when the client disconnects', async () => {
    process.env.OD_TAVILY_API_KEY = 'tvly-test';
    const capture: { signal: AbortSignal | null } = { signal: null };
    const fetchMock = vi.fn(
      async (_input: FetchInput, init?: FetchInit) =>
        new Promise<Response>((_resolve, reject) => {
          capture.signal = (init?.signal as AbortSignal | undefined) ?? null;
          const rejectAbort = () => {
            const error = new Error('aborted');
            error.name = 'AbortError';
            reject(error);
          };
          if (capture.signal?.aborted) {
            rejectAbort();
            return;
          }
          capture.signal?.addEventListener('abort', rejectAbort, {
            once: true,
          });
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { startServer } = await import('../src/server.js');
    const started = (await startServer({
      port: 0,
      returnServer: true,
    })) as StartedServer;

    try {
      const url = new URL(`${started.url}/api/research/search`);
      const body = JSON.stringify({ query: 'Open Design abort validation' });
      const clientReq = http.request(
        {
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
          },
        },
        () => {},
      );
      clientReq.on('error', () => {});
      clientReq.write(body);
      clientReq.end();

      await waitFor(() => capture.signal !== null, 5_000);
      clientReq.destroy();
      await waitFor(() => capture.signal?.aborted === true, 5_000);
    } finally {
      await closeServer(started.server);
    }
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
