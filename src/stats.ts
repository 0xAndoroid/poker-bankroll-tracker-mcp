import type { Session } from "./types.js";

export function computeProfit(session: Session): number {
  if (session.amount !== undefined) return session.amount;
  return (session.cashout ?? 0) - (session.buyin ?? 0) - (session.rebuy_cost ?? 0) - (session.expenses ?? 0);
}

export function formatStakes(session: Session): string {
  if (
    session.type !== "cashgame" ||
    session.small_blind === undefined ||
    session.big_blind === undefined
  ) {
    return "N/A";
  }
  const stakes = `${session.small_blind}/${session.big_blind}`;
  return session.game ? `${session.game} ${stakes}` : stakes;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

interface Bucket {
  sessions: number;
  profit: number;
}

export interface Stats {
  totalSessions: number;
  totalProfit: number;
  winRate: number;
  avgSessionProfit: number;
  currencies: string[];
  byLocation: Record<string, Bucket>;
  byStakes: Record<string, Bucket>;
  byMonth: Record<string, Bucket>;
}

export function computeStats(sessions: Session[]): Stats {
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalProfit: 0,
      winRate: 0,
      avgSessionProfit: 0,
      currencies: [],
      byLocation: {},
      byStakes: {},
      byMonth: {},
    };
  }

  let totalProfit = 0;
  let winningSessions = 0;
  const currencies = new Set<string>();
  const byLocation: Record<string, Bucket> = {};
  const byStakes: Record<string, Bucket> = {};
  const byMonth: Record<string, Bucket> = {};

  for (const session of sessions) {
    const profit = computeProfit(session);
    totalProfit += profit;
    if (profit > 0) winningSessions++;
    currencies.add(session.currency);

    const loc = session.location || "Unknown";
    const locBucket = (byLocation[loc] ??= { sessions: 0, profit: 0 });
    locBucket.sessions++;
    locBucket.profit = round2(locBucket.profit + profit);

    if (session.type === "cashgame") {
      const stakes = formatStakes(session);
      const stakesBucket = (byStakes[stakes] ??= { sessions: 0, profit: 0 });
      stakesBucket.sessions++;
      stakesBucket.profit = round2(stakesBucket.profit + profit);
    }

    const month = session.start.slice(0, 7);
    const monthBucket = (byMonth[month] ??= { sessions: 0, profit: 0 });
    monthBucket.sessions++;
    monthBucket.profit = round2(monthBucket.profit + profit);
  }

  return {
    totalSessions: sessions.length,
    totalProfit: round2(totalProfit),
    winRate: round2((winningSessions / sessions.length) * 100),
    avgSessionProfit: round2(totalProfit / sessions.length),
    currencies: [...currencies].sort(),
    byLocation,
    byStakes,
    byMonth,
  };
}
