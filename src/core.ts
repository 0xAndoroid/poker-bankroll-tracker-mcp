import type { PbtApiClient } from "./api.js";
import type { SessionFilters } from "./types.js";
import { computeStats, type Stats } from "./stats.js";
import { formatSessions, type FormattedSession } from "./session-output.js";

export async function getFormattedSessions(
  client: PbtApiClient,
  filters: SessionFilters = {},
): Promise<FormattedSession[]> {
  return formatSessions(await client.fetchSessions(filters));
}

export async function getSessionStats(
  client: PbtApiClient,
  filters: SessionFilters = {},
): Promise<Stats> {
  return computeStats(await client.fetchSessions(filters));
}
