#!/usr/bin/env node
import { Command, InvalidArgumentError, Option } from "commander";
import { PbtApiClient } from "./api.js";
import { getFormattedSessions, getReplays, getSessionStats } from "./core.js";
import { parseCurrencyFilter, parseDateFilter, parseIdFilter, parseTypeFilter } from "./filters.js";
import { renderReplaysTable, renderSessionsTable, renderStats } from "./cli-output.js";
import { packageVersion } from "./package-version.js";
import type { ReplayFilters, SessionFilters } from "./types.js";

type SessionOptions = SessionFilters & { json?: boolean };
type ReplayOptions = ReplayFilters & { json?: boolean };

const API_RATE_LIMIT_HELP = "API rate limit: 20 requests/15min.";

const program = new Command();
program
  .name("poker-bankroll-tracker")
  .description("Fetch sessions, statistics, and hand replays from Poker Bankroll Tracker.")
  .version(packageVersion)
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
  $ poker-bankroll-tracker replays --id 123 --json
`,
  );

addSessionFilterOptions(
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
  .action(async ({ json, ...filters }: SessionOptions) => {
    const sessions = await getFormattedSessions(makeClient(), filters);
    process.stdout.write(
      `${json ? JSON.stringify(sessions, null, 2) : renderSessionsTable(sessions)}\n`,
    );
  });

addSessionFilterOptions(
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
  .action(async ({ json, ...filters }: SessionOptions) => {
    const stats = await getSessionStats(makeClient(), filters);
    process.stdout.write(`${json ? JSON.stringify(stats, null, 2) : renderStats(stats)}\n`);
  });

addEntryFilterOptions(
  program
    .command("replays")
    .description("Fetch saved poker hand replays.")
    .allowUnknownOption(false)
    .allowExcessArguments(false),
)
  .option("--private", "Show only private replays")
  .option("--no-private", "Show only non-private replays")
  .option("--hub", "Show only replays published in the analysis hub")
  .option("--no-hub", "Show only replays not published in the analysis hub")
  .option("--json", "Emit full replay data, including hand histories, as JSON")
  .addHelpText(
    "after",
    `
Environment:
  PBT_API_KEY  Required Bearer token. ${API_RATE_LIMIT_HELP}

Examples:
  $ poker-bankroll-tracker replays --start 2026-03-01 --end 2026-03-31 --no-hub
  $ poker-bankroll-tracker replays --id 123 --json
`,
  )
  .action(async ({ json, ...filters }: ReplayOptions) => {
    const replays = await getReplays(makeClient(), filters);
    process.stdout.write(
      `${json ? JSON.stringify(replays, null, 2) : renderReplaysTable(replays)}\n`,
    );
  });

try {
  await program.parseAsync();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Error: ${message}\n`);
  process.exit(1);
}

function addEntryFilterOptions(command: Command): Command {
  return command
    .addOption(
      new Option("--id <id>", "Fetch a specific entry by ID (positive integer)").argParser(
        parseOption(parseIdFilter),
      ),
    )
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
    );
}

function addSessionFilterOptions(command: Command): Command {
  return addEntryFilterOptions(command)
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
    .option("--staking", "Filter to staking sessions")
    .option("--no-staking", "Filter to non-staking sessions");
}

function parseOption<T>(parser: (value: string) => T) {
  return (value: string): T => {
    try {
      return parser(value);
    } catch (error) {
      throw new InvalidArgumentError(error instanceof Error ? error.message : String(error));
    }
  };
}

function makeClient(): PbtApiClient {
  const apiKey = process.env.PBT_API_KEY;
  if (!apiKey) {
    throw new Error("PBT_API_KEY environment variable is required. See --help.");
  }
  return new PbtApiClient(apiKey);
}
