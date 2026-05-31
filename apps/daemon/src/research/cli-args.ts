export interface ResearchSubcommandArgs {
  sub: string | undefined;
  subArgs: string[];
}

export function splitResearchSubcommand(args: string[]): ResearchSubcommandArgs {
  const sub = args.find((a) => a && !a.startsWith('--'));
  if (!sub) return { sub: undefined, subArgs: args };

  const idx = args.indexOf(sub);
  return {
    sub,
    subArgs: [...args.slice(0, idx), ...args.slice(idx + 1)],
  };
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
