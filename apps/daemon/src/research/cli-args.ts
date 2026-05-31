export interface ResearchSubcommandArgs {
  sub: string | undefined;
  subArgs: string[];
}

const RESEARCH_SUBCOMMANDS = new Set(['help', 'search']);
const RESEARCH_VALUE_FLAGS = new Set([
  '--country',
  '--daemon-url',
  '--depth',
  '--end-date',
  '--exclude-domains',
  '--include-domains',
  '--max-sources',
  '--min-score',
  '--query',
  '--report',
  '--start-date',
  '--time-range',
  '--topic',
]);

export function splitResearchSubcommand(args: string[]): ResearchSubcommandArgs {
  const idx = findResearchSubcommandIndex(args);
  if (idx < 0) return { sub: undefined, subArgs: args };
  const sub = args[idx];
  return {
    sub,
    subArgs: [...args.slice(0, idx), ...args.slice(idx + 1)],
  };
}

function findResearchSubcommandIndex(args: string[]): number {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) continue;
    if (RESEARCH_SUBCOMMANDS.has(arg)) return index;
    if (
      RESEARCH_VALUE_FLAGS.has(arg) &&
      args[index + 1] &&
      !args[index + 1]!.startsWith('--')
    ) {
      index += 1;
    }
  }
  return -1;
}

export function parseOptionalNumberFlag(
  value: unknown,
  flagName: string,
): number | undefined {
  if (value == null) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`flag --${flagName} requires a finite number`);
  }
  return parsed;
}
