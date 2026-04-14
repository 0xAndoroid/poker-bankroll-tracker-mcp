import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PbtApiClient } from "./api.js";
import type { Session } from "./types.js";
import { computeProfit, computeStats, formatStakes } from "./stats.js";
import { PbtApiError } from "./errors.js";

function formatSession(session: Session) {
  const result: Record<string, unknown> = {
    id: session.id,
    type: session.type,
    startedAt: session.start,
    location: session.location,
    locationType: session.location_type,
    currency: session.currency,
    profit: computeProfit(session),
    private: session.private,
  };

  if (session.end != null) result.endedAt = session.end;
  if (session.amount != null) result.amount = session.amount;
  if (session.buyin != null) result.buyin = session.buyin;
  if (session.cashout != null) result.cashout = session.cashout;
  if (session.rebuys != null) result.rebuys = session.rebuys;
  if (session.rebuy_cost != null) result.rebuyCost = session.rebuy_cost;
  if (session.expenses != null) result.expenses = session.expenses;
  if (session.expenses_in_chips != null) result.expensesInChips = session.expenses_in_chips;
  if (session.exchange_rate != null) result.exchangeRate = session.exchange_rate;
  if (session.staking != null) result.staking = session.staking;
  if (session.staking_player != null) result.stakingPlayer = session.staking_player;
  if (session.shares_income != null) result.sharesIncome = session.shares_income;
  if (session.shares_outgoing != null) result.sharesOutgoing = session.shares_outgoing;
  if (session.game != null) result.game = session.game;
  if (session.limit != null) result.limit = session.limit;
  if (session.table_size != null) result.tableSize = session.table_size;
  if (session.hands_per_hour != null) result.handsPerHour = session.hands_per_hour;

  if (session.type === "cashgame") {
    result.stakes = formatStakes(session);
    if (session.small_blind != null) result.smallBlind = session.small_blind;
    if (session.big_blind != null) result.bigBlind = session.big_blind;
    if (session.third_blind != null) result.thirdBlind = session.third_blind;
    if (session.ante != null) result.ante = session.ante;
  }

  if (session.type === "tournament") {
    if (session.addon_cost != null) result.addonCost = session.addon_cost;
    if (session.bounty_won != null) result.bountyWon = session.bounty_won;
    if (session.place != null) result.place = session.place;
    if (session.itm != null) result.itm = session.itm;
    if (session.players != null) result.players = session.players;
  }

  if (session.stack_history != null) result.stackHistory = session.stack_history;

  return result;
}

function toolError(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

function toolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

const sessionFilterSchema = {
  start: z.string().describe("Start date (YYYY-MM-DD)").optional(),
  end: z.string().describe("End date (YYYY-MM-DD)").optional(),
  type: z
    .string()
    .describe(
      "Session type: cashgame, tournament, payout, costs, casinogame, jackpot (comma-separated)",
    )
    .optional(),
  currency: z.string().describe("Currency filter: ISO codes (comma-separated)").optional(),
  staking: z.boolean().describe("Filter by staking sessions").optional(),
};

export function registerTools(server: McpServer, client: PbtApiClient): void {
  server.registerTool(
    "get_sessions",
    {
      description:
        "Fetch poker sessions with optional filters. Returns session data with calculated profit/loss. WARNING: broad date ranges may return many sessions and consume significant tokens. Use narrow date ranges when possible.",
      inputSchema: sessionFilterSchema,
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      try {
        const sessions = await client.fetchSessions(args);
        return toolResult(sessions.map(formatSession));
      } catch (error) {
        if (error instanceof PbtApiError) return toolError(error.message);
        throw error;
      }
    },
  );

  server.registerTool(
    "get_stats",
    {
      description:
        "Compute aggregate statistics from poker sessions: total profit, win rate, average session profit, total sessions, breakdowns by location/stakes/month.",
      inputSchema: sessionFilterSchema,
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      try {
        const sessions = await client.fetchSessions(args);
        return toolResult(computeStats(sessions));
      } catch (error) {
        if (error instanceof PbtApiError) return toolError(error.message);
        throw error;
      }
    },
  );
}
