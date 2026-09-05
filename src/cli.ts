#!/usr/bin/env node
import { Command, InvalidArgumentError, Option } from "commander";
import { PbtApiClient } from "./api.js";
import { getFormattedSessions, getSessionStats } from "./core.js";
import { parseCurrencyFilter, parseDateFilter, parseTypeFilter } from "./filters.js";
import { renderSessionsTable, renderStats } from "./cli-output.js";
import type { SessionFilters } from "./types.js";

interface CliOptions {
  start?: string;
  end?: string;
  currency?: string;
  type?: string;
  staking?: boolean;
  json?: boolean;
}

const API_RATE_LIMIT_HELP = "API rate limit: 20 requests/15min.";

const program = new Command();
program
  .name("poker-bankroll-tracker")
  .description(
    "Low-context CLI for Poker Bankroll Tracker sessions and stats. Mirrors the MCP tools exactly.",
  )
  .version("1.2.0")
  .showHelpAfterError("\nRun with --help for usage.")
  .showSuggestionAfterError()
  .allowUnknownOption(false)
  .allowExcessArguments(false)
  .addHelpText(
    "after",
    `
Environment:
  PBT_API_KEY  Bearer token for https://api.pokerbankrolltracker.net/v1. ${API_RATE_LIMIT_HELP}

Examples:
  $ PBT_API_KEY=... poker-bankroll-tracker sessions --start 2026-01-01 --end 2026-03-31
  $ poker-bankroll-tracker sessions --type cashgame,tournament --currency USD --json
  $ poker-bankroll-tracker stats --start 2026-01-01 --type cashgame
`,
  );

addFilterOptions(
  program
    .command("sessions")
    .description("Fetch poker sessions with calculated profit/loss.")
    .allowUnknownOption(false)
    .allowExcessArguments(false),
)
  .option("--json", "Emit strict JSON to stdout and no other output")
  .addHelpText(
    "after",
    `
Environment:
  PBT_API_KEY  Required Bearer token. ${API_RATE_LIMIT_HELP}

Examples:
  $ poker-bankroll-tracker sessions --start 2026-03-01 --end 2026-03-31
  $ poker-bankroll-tracker sessions --type cashgame,tournament --currency USD,EUR
  $ poker-bankroll-tracker sessions --staking --json
`,
  )
  .action(async (options: CliOptions) => {
    const client = makeClient();
    const filters = filtersFromOptions(options);
    const sessions = await getFormattedSessions(client, filters);
    process.stdout.write(
      `${options.json ? JSON.stringify(sessions, null, 2) : renderSessionsTable(sessions)}\n`,
    );
  });

addFilterOptions(
  program
    .command("stats")
    .description(
      "Compute total profit, win rate, average session profit, and breakdowns by location/stakes/month.",
    )
    .allowUnknownOption(false)
    .allowExcessArguments(false),
)
  .option("--json", "Emit strict JSON to stdout and no other output")
  .addHelpText(
    "after",
    `
Environment:
  PBT_API_KEY  Required Bearer token. ${API_RATE_LIMIT_HELP}

Examples:
  $ poker-bankroll-tracker stats --start 2026-01-01
  $ poker-bankroll-tracker stats --type cashgame --currency USD
  $ poker-bankroll-tracker stats --staking --json
`,
  )
  .action(async (options: CliOptions) => {
    const client = makeClient();
    const filters = filtersFromOptions(options);
    const stats = await getSessionStats(client, filters);
    process.stdout.write(`${options.json ? JSON.stringify(stats, null, 2) : renderStats(stats)}\n`);
  });

try {
  await program.parseAsync();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

function addFilterOptions(command: Command): Command {
  return command
    .addOption(
      new Option(
        "--start <YYYY-MM-DD>",
        "Start date filter, format YYYY-MM-DD, example 2026-01-01",
      ).argParser(parseOption(parseDateFilter)),
    )
    .addOption(
      new Option(
        "--end <YYYY-MM-DD>",
        "End date filter, format YYYY-MM-DD, example 2026-03-31",
      ).argParser(parseOption(parseDateFilter)),
    )
    .addOption(
      new Option(
        "--currency <ISO[,ISO]>",
        "Currency filter, comma-separated 3-letter ISO codes, example USD,EUR",
      ).argParser(parseOption(parseCurrencyFilter)),
    )
    .addOption(
      new Option(
        "--type <type[,type]>",
        "Session type filter: cashgame,tournament,payout,costs,casinogame,jackpot",
      ).argParser(parseOption(parseTypeFilter)),
    )
    .option("--staking", "Filter to staking sessions");
}

function parseOption(parser: (value: string) => string) {
  return (value: string): string => {
    try {
      return parser(value);
    } catch (error) {
      throw new InvalidArgumentError(error instanceof Error ? error.message : String(error));
    }
  };
}

function filtersFromOptions(options: CliOptions): SessionFilters {
  return {
    start: options.start,
    end: options.end,
    currency: options.currency,
    type: options.type,
    staking: options.staking === true ? true : undefined,
  };
}

function makeClient(): PbtApiClient {
  const apiKey = process.env.PBT_API_KEY;
  if (!apiKey) {
    throw new Error("PBT_API_KEY environment variable is required. See --help.");
  }
  return new PbtApiClient(apiKey);
}
