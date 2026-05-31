export interface ParseFlagOptions {
  string?: Set<string>;
  boolean?: Set<string>;
}

export type ParsedFlags = Record<string, string | boolean>;

export function parseFlags(
  argv: string[],
  opts: ParseFlagOptions = {},
): ParsedFlags {
  const stringFlags = opts.string instanceof Set ? opts.string : new Set<string>();
  const booleanFlags =
    opts.boolean instanceof Set ? opts.boolean : new Set<string>();
  const knownFlags = new Set([...stringFlags, ...booleanFlags]);
  const out: ParsedFlags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a || !a.startsWith('--')) {
      throw new Error(`unexpected positional argument: ${a}`);
    }
    const eq = a.indexOf('=');
    const key = eq >= 0 ? a.slice(2, eq) : a.slice(2);
    if (knownFlags.size > 0 && !knownFlags.has(key)) {
      throw new Error(
        `unknown flag: --${key}. Run with --help for the list of accepted flags.`,
      );
    }
    if (eq >= 0) {
      const value = a.slice(eq + 1);
      if (booleanFlags.has(key)) {
        if (value === 'true') {
          out[key] = true;
          continue;
        }
        if (value === 'false') {
          out[key] = false;
          continue;
        }
        throw new Error(`flag --${key} requires a boolean value`);
      }
      out[key] = value;
      continue;
    }
    if (booleanFlags.has(key)) {
      out[key] = true;
      continue;
    }
    if (stringFlags.has(key)) {
      const next = argv[i + 1];
      if (next == null || next.startsWith('--')) {
        throw new Error(`flag --${key} requires a value`);
      }
      out[key] = next;
      i += 1;
      continue;
    }
    const next = argv[i + 1];
    if (next != null && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = true;
    }
  }
  return out;
}
