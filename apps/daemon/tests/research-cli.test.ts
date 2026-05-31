import { describe, expect, it } from 'vitest';

import {
  collectRepeatedStringFlagValues,
  parseOptionalNumberFlag,
  splitRepeatedCommaFlagValues,
  splitResearchSubcommand,
} from '../src/research/cli-args.js';

describe('research CLI', () => {
  it('preserves query values equal to the search subcommand', () => {
    expect(
      splitResearchSubcommand([
        'search',
        '--query',
        'search',
        '--daemon-url',
        'http://127.0.0.1:7456',
      ]),
    ).toEqual({
      sub: 'search',
      subArgs: ['--query', 'search', '--daemon-url', 'http://127.0.0.1:7456'],
    });
  });

  it('finds the research subcommand after leading value flags', () => {
    expect(
      splitResearchSubcommand([
        '--daemon-url',
        'http://127.0.0.1:7456',
        'search',
        '--query',
        'Open Design research',
      ]),
    ).toEqual({
      sub: 'search',
      subArgs: [
        '--daemon-url',
        'http://127.0.0.1:7456',
        '--query',
        'Open Design research',
      ],
    });
  });

  it('does not treat search-like flag values as research subcommands', () => {
    expect(splitResearchSubcommand(['--query', 'search'])).toEqual({
      sub: undefined,
      subArgs: ['--query', 'search'],
    });
  });

  it('keeps depth flags inside the search subcommand args', () => {
    expect(
      splitResearchSubcommand([
        'search',
        '--query',
        'AI design tools',
        '--depth',
        'deep',
        '--topic',
        'news',
        '--country',
        'kr',
        '--time-range',
        'week',
        '--start-date',
        '2026-05-01',
        '--end-date',
        '2026-05-31',
        '--include-domains',
        'openai.com,docs.openai.com',
        '--exclude-domains',
        'reddit.com',
        '--exact-match',
        '--min-score',
        '0.5',
        '--include-images',
        '--include-raw-content',
        '--auto-parameters',
        '--max-sources',
        '20',
      ]),
    ).toEqual({
      sub: 'search',
      subArgs: [
        '--query',
        'AI design tools',
        '--depth',
        'deep',
        '--topic',
        'news',
        '--country',
        'kr',
        '--time-range',
        'week',
        '--start-date',
        '2026-05-01',
        '--end-date',
        '2026-05-31',
        '--include-domains',
        'openai.com,docs.openai.com',
        '--exclude-domains',
        'reddit.com',
        '--exact-match',
        '--min-score',
        '0.5',
        '--include-images',
        '--include-raw-content',
        '--auto-parameters',
        '--max-sources',
        '20',
      ],
    });
  });

  it('parses optional numeric flags before CLI request serialization', () => {
    expect(parseOptionalNumberFlag(undefined, 'min-score')).toBeUndefined();
    expect(() => parseOptionalNumberFlag('', 'min-score')).toThrow(
      'flag --min-score requires a finite number',
    );
    expect(() => parseOptionalNumberFlag('   ', 'min-score')).toThrow(
      'flag --min-score requires a finite number',
    );
    expect(parseOptionalNumberFlag('0', 'min-score')).toBe(0);
    expect(parseOptionalNumberFlag('0.5', 'min-score')).toBe(0.5);
    expect(parseOptionalNumberFlag('50', 'max-sources')).toBe(50);
    expect(() => parseOptionalNumberFlag('high', 'min-score')).toThrow(
      'flag --min-score requires a finite number',
    );
  });

  it('collects repeated domain filter flags before request serialization', () => {
    const args = [
      '--include-domains',
      'openai.com',
      '--include-domains=docs.openai.com,platform.openai.com',
      '--exclude-domains',
      'reddit.com',
      '--include-domains',
      'developers.openai.com',
    ];

    expect(collectRepeatedStringFlagValues(args, 'include-domains')).toEqual([
      'openai.com',
      'docs.openai.com,platform.openai.com',
      'developers.openai.com',
    ]);
    expect(splitRepeatedCommaFlagValues(args, 'include-domains')).toEqual([
      'openai.com',
      'docs.openai.com',
      'platform.openai.com',
      'developers.openai.com',
    ]);
  });
});
