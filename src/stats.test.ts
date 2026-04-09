import { describe, it, expect } from "vitest";
import { computeProfit, formatStakes, computeStats } from "./stats.js";
import type { Session } from "./types.js";

function makeCashGame(overrides: Partial<Session> = {}): Session {
  return {
    id: 1,
    type: "cashgame",
    start: "2026-03-15 19:00:00",
    end: "2026-03-16 03:00:00",
    location: "Bellagio",
    location_type: "Casino",
    currency: "USD",
    buyin: 500,
    cashout: 1200,
    number_of_rebuys: 0,
    rebuy_costs: 0,
    expenses: 0,
    expenses_in_chips: 0,
    currency_exchange_rate: "1.000000000000",
    staking: false,
    private: false,
    limit: "No Limit",
    game: "NLH",
    table_size: "Full-Ring",
    small_blind: 1,
    big_blind: 2,
    third_blind: 0,
    ante: 0,
    hands_per_hour: 25,
    ...overrides,
  };
}

function makeTournament(overrides: Partial<Session> = {}): Session {
  return {
    id: 2,
    type: "tournament",
    start: "2026-03-16 12:00:00",
    end: "2026-03-16 20:00:00",
    location: "Aria",
    location_type: "Casino",
    currency: "USD",
    buyin: 200,
    cashout: 0,
    number_of_rebuys: 1,
    rebuy_costs: 200,
    expenses: 0,
    expenses_in_chips: 0,
    currency_exchange_rate: "1.000000000000",
    staking: false,
    private: false,
    ...overrides,
  };
}

function makeSimpleSession(
  type: "payout" | "costs" | "casinogame" | "jackpot",
  overrides: Partial<Session> = {},
): Session {
  return {
    id: 3,
    type,
    start: "2026-04-09 12:50:00",
    location: "",
    location_type: "Online",
    currency: "USD",
    amount: 0,
    private: false,
    ...overrides,
  };
}

describe("computeProfit", () => {
  it("computes profit for a winning cash game session", () => {
    const session = makeCashGame({ buyin: 500, cashout: 1200 });
    expect(computeProfit(session)).toBe(700);
  });

  it("computes profit for a losing session", () => {
    const session = makeCashGame({ buyin: 500, cashout: 200 });
    expect(computeProfit(session)).toBe(-300);
  });

  it("accounts for rebuy costs", () => {
    const session = makeCashGame({ buyin: 500, cashout: 1000, rebuy_costs: 300 });
    expect(computeProfit(session)).toBe(200);
  });

  it("accounts for expenses", () => {
    const session = makeCashGame({ buyin: 500, cashout: 800, expenses: 50 });
    expect(computeProfit(session)).toBe(250);
  });

  it("accounts for all cost components together", () => {
    const session = makeCashGame({
      buyin: 500,
      cashout: 1500,
      rebuy_costs: 200,
      expenses: 100,
    });
    expect(computeProfit(session)).toBe(700);
  });

  it("computes profit for a losing tournament with rebuy", () => {
    const session = makeTournament();
    expect(computeProfit(session)).toBe(-400);
  });

  it("returns zero for a break-even session", () => {
    const session = makeCashGame({ buyin: 500, cashout: 500 });
    expect(computeProfit(session)).toBe(0);
  });

  it("returns amount directly for payout session", () => {
    expect(computeProfit(makeSimpleSession("payout", { amount: 50 }))).toBe(50);
  });

  it("returns negative amount for costs session", () => {
    expect(computeProfit(makeSimpleSession("costs", { amount: -20 }))).toBe(-20);
  });

  it("returns amount for casinogame session", () => {
    expect(computeProfit(makeSimpleSession("casinogame", { amount: -10 }))).toBe(-10);
  });

  it("returns amount for jackpot session", () => {
    expect(computeProfit(makeSimpleSession("jackpot", { amount: 100 }))).toBe(100);
  });
});

describe("formatStakes", () => {
  it("formats cash game stakes with game type", () => {
    const session = makeCashGame({ game: "NLH", small_blind: 1, big_blind: 2 });
    expect(formatStakes(session)).toBe("NLH 1/2");
  });

  it("formats stakes without game type", () => {
    const session = makeCashGame({ game: undefined, small_blind: 5, big_blind: 10 });
    expect(formatStakes(session)).toBe("5/10");
  });

  it("returns N/A for non-cashgame sessions", () => {
    const session = makeTournament();
    expect(formatStakes(session)).toBe("N/A");
  });

  it("returns N/A when blind info is missing", () => {
    const session = makeCashGame({ small_blind: undefined, big_blind: undefined });
    expect(formatStakes(session)).toBe("N/A");
  });
});

describe("computeStats", () => {
  it("returns zeroed stats for empty sessions", () => {
    const stats = computeStats([]);
    expect(stats.totalSessions).toBe(0);
    expect(stats.totalProfit).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.avgSessionProfit).toBe(0);
    expect(stats.currencies).toEqual([]);
    expect(stats.byLocation).toEqual({});
    expect(stats.byStakes).toEqual({});
    expect(stats.byMonth).toEqual({});
  });

  it("computes correct aggregate stats", () => {
    const sessions = [
      makeCashGame({ id: 1, buyin: 500, cashout: 1200, location: "Bellagio" }),
      makeCashGame({
        id: 2,
        buyin: 500,
        cashout: 200,
        location: "Bellagio",
        start: "2026-03-20 20:00:00",
      }),
      makeCashGame({
        id: 3,
        buyin: 300,
        cashout: 900,
        location: "Aria",
        start: "2026-04-01 19:00:00",
      }),
    ];
    const stats = computeStats(sessions);

    expect(stats.totalSessions).toBe(3);
    expect(stats.totalProfit).toBe(1000);
    expect(stats.winRate).toBeCloseTo(66.67, 1);
    expect(stats.avgSessionProfit).toBeCloseTo(333.33, 1);
    expect(stats.currencies).toEqual(["USD"]);
  });

  it("breaks down by location", () => {
    const sessions = [
      makeCashGame({ id: 1, buyin: 500, cashout: 1200, location: "Bellagio" }),
      makeCashGame({ id: 2, buyin: 500, cashout: 200, location: "Bellagio" }),
      makeCashGame({ id: 3, buyin: 300, cashout: 900, location: "Aria" }),
    ];
    const stats = computeStats(sessions);

    expect(stats.byLocation["Bellagio"]).toEqual({ sessions: 2, profit: 400 });
    expect(stats.byLocation["Aria"]).toEqual({ sessions: 1, profit: 600 });
  });

  it("breaks down by stakes for cash games only", () => {
    const sessions = [
      makeCashGame({ id: 1, small_blind: 1, big_blind: 2, buyin: 200, cashout: 400 }),
      makeCashGame({ id: 2, small_blind: 2, big_blind: 5, buyin: 500, cashout: 300 }),
      makeTournament({ id: 3, buyin: 100, cashout: 500 }),
    ];
    const stats = computeStats(sessions);

    expect(stats.byStakes["NLH 1/2"]).toEqual({ sessions: 1, profit: 200 });
    expect(stats.byStakes["NLH 2/5"]).toEqual({ sessions: 1, profit: -200 });
    expect(Object.keys(stats.byStakes)).toHaveLength(2);
  });

  it("breaks down by month", () => {
    const sessions = [
      makeCashGame({ id: 1, start: "2026-03-15 19:00:00", buyin: 500, cashout: 800 }),
      makeCashGame({ id: 2, start: "2026-03-20 19:00:00", buyin: 500, cashout: 400 }),
      makeCashGame({ id: 3, start: "2026-04-01 19:00:00", buyin: 300, cashout: 700 }),
    ];
    const stats = computeStats(sessions);

    expect(stats.byMonth["2026-03"]).toEqual({ sessions: 2, profit: 200 });
    expect(stats.byMonth["2026-04"]).toEqual({ sessions: 1, profit: 400 });
  });

  it("tracks multiple currencies", () => {
    const sessions = [
      makeCashGame({ id: 1, currency: "USD" }),
      makeCashGame({ id: 2, currency: "EUR" }),
      makeCashGame({ id: 3, currency: "USD" }),
    ];
    const stats = computeStats(sessions);
    expect(stats.currencies).toEqual(["EUR", "USD"]);
  });

  it("handles session with empty location", () => {
    const sessions = [makeCashGame({ location: "" })];
    const stats = computeStats(sessions);
    expect(stats.byLocation["Unknown"]).toBeDefined();
  });

  it("includes simple session types in aggregates", () => {
    const sessions = [
      makeCashGame({ id: 1, buyin: 500, cashout: 1200, location: "Bellagio" }),
      makeSimpleSession("jackpot", { id: 2, amount: 100, location: "Bellagio", start: "2026-03-15 20:00:00" }),
      makeSimpleSession("costs", { id: 3, amount: -50, location: "Online", start: "2026-04-01 10:00:00" }),
    ];
    const stats = computeStats(sessions);

    expect(stats.totalSessions).toBe(3);
    expect(stats.totalProfit).toBe(750);
    expect(stats.winRate).toBeCloseTo(66.67, 1);
    expect(stats.byLocation["Bellagio"]).toEqual({ sessions: 2, profit: 800 });
    expect(stats.byMonth["2026-04"]).toEqual({ sessions: 1, profit: -50 });
    expect(Object.keys(stats.byStakes)).toHaveLength(1);
  });
});
