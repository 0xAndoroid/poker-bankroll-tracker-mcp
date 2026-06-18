import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PbtApiClient } from "./api.js";
import { getFormattedSessions, getSessionStats } from "./core.js";
import { PbtApiError } from "./errors.js";
import { sessionFilterSchema } from "./filters.js";

function toolError(message: string) {
  return { content: [{ type: "text" as const, text: message }], isError: true };
}

function toolResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
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
    async (args) => {
      try {
        return toolResult(await getFormattedSessions(client, args));
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
        return toolResult(await getSessionStats(client, args));
      } catch (error) {
        if (error instanceof PbtApiError) return toolError(error.message);
        throw error;
      }
    },
  );
}
