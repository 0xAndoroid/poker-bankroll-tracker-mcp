import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PbtApiClient } from "./api.js";
import { getFormattedSessions, getReplays, getSessionStats } from "./core.js";
import { PbtApiError } from "./errors.js";
import { FilterValidationError, replayFilterSchema, sessionFilterSchema } from "./filters.js";

async function toolResult(result: Promise<unknown>) {
  try {
    const data = await result;
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  } catch (error) {
    if (error instanceof PbtApiError || error instanceof FilterValidationError) {
      return { content: [{ type: "text" as const, text: error.message }], isError: true };
    }
    throw error;
  }
}

export function registerTools(server: McpServer, client: PbtApiClient): void {
  server.registerTool(
    "get_sessions",
    {
      description:
        "Fetch poker sessions with optional filters. Returns session data with calculated profit/loss. WARNING: broad date ranges may return many sessions and consume significant tokens. Use narrow date ranges when possible.",
      inputSchema: sessionFilterSchema,
      annotations: { readOnlyHint: true },
    },
    (args) => toolResult(getFormattedSessions(client, args)),
  );

  server.registerTool(
    "get_stats",
    {
      description:
        "Compute aggregate statistics from poker sessions: total profit, win rate, average session profit, total sessions, breakdowns by location/stakes/month.",
      inputSchema: sessionFilterSchema,
      annotations: { readOnlyHint: true },
    },
    (args) => toolResult(getSessionStats(client, args)),
  );

  server.registerTool(
    "get_replays",
    {
      description:
        "Fetch saved poker hand replays with their full hand histories. Use a replay ID or a narrow date range to limit the result.",
      inputSchema: replayFilterSchema,
      annotations: { readOnlyHint: true },
    },
    (args) => toolResult(getReplays(client, args)),
  );
}
