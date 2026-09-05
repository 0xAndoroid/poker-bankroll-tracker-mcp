import type { FormattedSession } from "./session-output.js";
import type { Stats } from "./stats.js";

export function renderSessionsTable(sessions: FormattedSession[]): string {
  if (sessions.length === 0) return "No sessions found.";

  const rows = sessions.map((session) => ({
    id: String(session.id ?? ""),
    type: String(session.type ?? ""),
    startedAt: String(session.startedAt ?? ""),
    location: String(session.location ?? ""),
    currency: String(session.currency ?? ""),
    profit: String(session.profit ?? ""),
    stakes: String(session.stakes ?? ""),
    staking: session.staking == null ? "" : String(session.staking),
  }));

  return renderTable(
    ["id", "type", "startedAt", "location", "currency", "profit", "stakes", "staking"],
    rows,
  );
}

export function renderStats(stats: Stats): string {
  const lines = [
    `totalSessions: ${stats.totalSessions}`,
    `totalProfit: ${stats.totalProfit}`,
    `winRate: ${stats.winRate}%`,
    `avgSessionProfit: ${stats.avgSessionProfit}`,
    `currencies: ${stats.currencies.length === 0 ? "none" : stats.currencies.join(",")}`,
  ];

  lines.push("", "byLocation:", renderBucketTable(stats.byLocation));
  lines.push("", "byStakes:", renderBucketTable(stats.byStakes));
  lines.push("", "byMonth:", renderBucketTable(stats.byMonth));

  return lines.join("\n");
}

function renderBucketTable(buckets: Record<string, { sessions: number; profit: number }>): string {
  const rows = Object.entries(buckets)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, bucket]) => ({
      name,
      sessions: String(bucket.sessions),
      profit: String(bucket.profit),
    }));

  if (rows.length === 0) return "  none";
  return renderTable(["name", "sessions", "profit"], rows)
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
}

function renderTable(headers: string[], rows: Array<Record<string, string>>): string {
  const widths = headers.map((header) =>
    rows.reduce((width, row) => Math.max(width, (row[header] ?? "").length), header.length),
  );
  const formatRow = (row: Record<string, string>) =>
    headers.map((header, index) => (row[header] ?? "").padEnd(widths[index])).join("  ");

  return [
    headers.map((header, index) => header.padEnd(widths[index])).join("  "),
    widths.map((width) => "-".repeat(width)).join("  "),
    ...rows.map(formatRow),
  ].join("\n");
}
