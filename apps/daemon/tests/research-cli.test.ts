import { describe, expect, it } from 'vitest';

import { splitResearchSubcommand } from '../src/research/cli-args.js';

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

  it('keeps depth flags inside the search subcommand args', () => {
    expect(
      splitResearchSubcommand([
        'search',
        '--query',
        'AI design tools',
        '--depth',
        'deep',
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
        '--max-sources',
        '20',
      ],
    });
  });
});
