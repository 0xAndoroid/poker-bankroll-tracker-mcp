import type { PbtApiClient } from "./api.js";
import type { SessionFilters } from "./types.js";
import { validateSessionFilters } from "./filters.js";
import { computeStats, type Stats } from "./stats.js";
import { formatSession, type FormattedSession } from "./session-output.js";

export async function getFormattedSessions(
  client: PbtApiClient,
  filters: SessionFilters = {},
): Promise<FormattedSession[]> {
  const fetchedSessions = await client.fetchSessions(validateSessionFilters(filters));
  return fetchedSessions.map(formatSession);
}

export async function getSessionStats(
  client: PbtApiClient,
  filters: SessionFilters = {},
): Promise<Stats> {
  return computeStats(await client.fetchSessions(validateSessionFilters(filters)));
}
