import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PbtApiClient } from "./api.js";
import type { Session } from "./types.js";
import { computeProfit, computeStats, formatStakes } from "./stats.js";
import { PbtApiError } from "./errors.js";

function formatSession(session: Session) {
  return {
    id: session.id,
    type: session.type,
    startedAt: session.start.replace(" ", "T"),
    location: session.location,
    locationType: session.location_type,
    currency: session.currency,
    buyin: session.buyin,
    cashout: session.cashout,
    rebuys: session.number_of_rebuys,
    rebuyCosts: session.rebuy_costs,
    expenses: session.expenses,
    profit: computeProfit(session),
    staking: session.staking,
    ...(session.type === "cashgame" && {
      stakes: formatStakes(session),
      game: session.game,
      limit: session.limit,
      tableSize: session.table_size,
      handsPerHour: session.hands_per_hour,
    }),
  };
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
