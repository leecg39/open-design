import { describe, expect, it } from 'vitest';

import { parseFlags } from '../src/cli-flags.js';

describe('parseFlags', () => {
  it('rejects string flags when the next token is another flag', () => {
    expect(() =>
      parseFlags(['--query', '--depth', 'deep'], {
        string: new Set(['query', 'depth']),
      }),
    ).toThrow('flag --query requires a value');
  });

  it('keeps equals-form values that start with dashes', () => {
    expect(
      parseFlags(['--query=--literal', '--include-images'], {
        string: new Set(['query']),
        boolean: new Set(['include-images']),
      }),
    ).toEqual({
      query: '--literal',
      'include-images': true,
    });
  });
});
