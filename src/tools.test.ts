import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PbtApiClient } from "./api.js";
import { registerTools } from "./tools.js";
import type { Session } from "./types.js";
import { PbtApiError } from "./errors.js";

const CASH_SESSION: Session = {
  id: 101,
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
  staking_player: "Mike",
  shares_income: 100,
  shares_outgoing: 50,
  private: false,
  limit: "No Limit",
  game: "NLH",
  table_size: "Full-Ring",
  small_blind: 1,
  big_blind: 2,
  third_blind: 0,
  ante: 0,
  hands_per_hour: 25,
};

const TOURNAMENT_SESSION: Session = {
  id: 102,
  type: "tournament",
  start: "2026-03-16 12:00:00",
  end: "2026-03-16 20:00:00",
  location: "Aria",
  location_type: "Casino",
  currency: "USD",
  buyin: 200,
  cashout: 800,
  number_of_rebuys: 0,
  rebuy_costs: 0,
  expenses: 0,
  currency_exchange_rate: "1.000000000000",
  staking: false,
  staking_player: "Sarah",
  private: false,
  limit: "No Limit",
  game: "NLH",
  table_size: "Full-Ring",
  hands_per_hour: 75,
  addon_costs: 0,
  bounty_winnings: 50,
  place: 3,
  itm: 5,
  players: 120,
  shares_income: 200,
  shares_outgoing: 0,
};

const PAYOUT_SESSION: Session = {
  id: 103,
  type: "payout",
  start: "2026-04-09 12:50:00",
  location: "",
  location_type: "Home Game",
  currency: "USD",
  amount: 1,
  private: true,
};

const COSTS_SESSION: Session = {
  id: 104,
  type: "costs",
  start: "2026-04-09 12:50:00",
  location: "Blue diamonds (online)",
  location_type: "Online",
  currency: "USD",
  amount: -2,
  private: true,
};

const CASINOGAME_SESSION: Session = {
  id: 105,
  type: "casinogame",
  start: "2026-04-09 12:46:00",
  location: "Blue diamonds (online)",
  location_type: "Online",
  currency: "USD",
  amount: -1,
  private: false,
};

const JACKPOT_SESSION: Session = {
  id: 106,
  type: "jackpot",
  start: "2026-04-09 12:49:00",
  location: "Blue diamonds (online)",
  location_type: "Online",
  currency: "USD",
  amount: 1,
  private: false,
};

type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}>;

function captureTools(server: McpServer, client: PbtApiClient) {
  const tools = new Map<string, ToolHandler>();
  const originalRegisterTool = server.registerTool.bind(server);

  vi.spyOn(server, "registerTool").mockImplementation(
    (name: string, _config: unknown, cb: unknown) => {
      tools.set(name, cb as ToolHandler);
      return originalRegisterTool(name, _config as never, cb as never);
    },
  );

  registerTools(server, client);
  return tools;
}

describe("MCP Tools", () => {
  let client: PbtApiClient;
  let server: McpServer;
  let tools: Map<string, ToolHandler>;

  beforeEach(() => {
    client = new PbtApiClient("test-key");
    server = new McpServer({ name: "test", version: "0.0.0" });

    vi.spyOn(client, "fetchSessions").mockResolvedValue([CASH_SESSION, TOURNAMENT_SESSION]);
    tools = captureTools(server, client);
  });

  describe("get_sessions", () => {
    it("returns formatted sessions with profit", async () => {
      const handler = tools.get("get_sessions")!;
      const result = await handler({});
      const data = JSON.parse(result.content[0].text);

      expect(data).toHaveLength(2);
      expect(data[0].id).toBe(101);
      expect(data[0].endedAt).toBe("2026-03-16T03:00:00");
      expect(data[0].expensesInChips).toBe(0);
      expect(data[0].currencyExchangeRate).toBe("1.000000000000");
      expect(data[0].private).toBe(false);
      expect(data[0].profit).toBe(700);
      expect(data[0].stakingPlayer).toBe("Mike");
      expect(data[0].sharesIncome).toBe(100);
      expect(data[0].sharesOutgoing).toBe(50);
      expect(data[0].stakes).toBe("NLH 1/2");
      expect(data[0].smallBlind).toBe(1);
      expect(data[0].bigBlind).toBe(2);
      expect(data[0].thirdBlind).toBe(0);
      expect(data[0].ante).toBe(0);
      expect(data[1].id).toBe(102);
      expect(data[1].endedAt).toBe("2026-03-16T20:00:00");
      expect(data[1].stakingPlayer).toBe("Sarah");
      expect(data[1].profit).toBe(600);
      expect(data[1].game).toBe("NLH");
      expect(data[1].limit).toBe("No Limit");
      expect(data[1].tableSize).toBe("Full-Ring");
      expect(data[1].handsPerHour).toBe(75);
      expect(data[1].addonCosts).toBe(0);
      expect(data[1].bountyWinnings).toBe(50);
      expect(data[1].place).toBe(3);
      expect(data[1].itm).toBe(5);
      expect(data[1].players).toBe(120);
      expect(data[1].sharesIncome).toBe(200);
      expect(data[1].sharesOutgoing).toBe(0);
      expect(data[0]).not.toHaveProperty("addonCosts");
      expect(data[0]).not.toHaveProperty("bountyWinnings");
      expect(data[0]).not.toHaveProperty("place");
      expect(data[1]).not.toHaveProperty("stakes");
      expect(data[1]).not.toHaveProperty("smallBlind");
      expect(data[1]).not.toHaveProperty("bigBlind");
      expect(data[1]).not.toHaveProperty("ante");
    });

    it("formats simple session types with amount", async () => {
      vi.spyOn(client, "fetchSessions").mockResolvedValue([
        PAYOUT_SESSION,
        COSTS_SESSION,
        CASINOGAME_SESSION,
        JACKPOT_SESSION,
      ]);

      const handler = tools.get("get_sessions")!;
      const result = await handler({});
      const data = JSON.parse(result.content[0].text);

      expect(data).toHaveLength(4);

      const fullSessionKeys = [
        "buyin",
        "cashout",
        "rebuys",
        "rebuyCosts",
        "expenses",
        "expensesInChips",
        "currencyExchangeRate",
        "staking",
        "stakingPlayer",
        "game",
        "limit",
        "tableSize",
        "handsPerHour",
        "stakes",
        "smallBlind",
        "bigBlind",
        "thirdBlind",
        "ante",
        "addonCosts",
        "bountyWinnings",
        "place",
        "itm",
        "players",
        "sharesIncome",
        "sharesOutgoing",
      ];

      expect(data[0].type).toBe("payout");
      expect(data[0].amount).toBe(1);
      expect(data[0].profit).toBe(1);
      expect(data[0].private).toBe(true);
      for (const key of fullSessionKeys) {
        expect(data[0]).not.toHaveProperty(key);
      }

      expect(data[1].type).toBe("costs");
      expect(data[1].amount).toBe(-2);
      expect(data[1].profit).toBe(-2);
      for (const key of fullSessionKeys) {
        expect(data[1]).not.toHaveProperty(key);
      }

      expect(data[2].type).toBe("casinogame");
      expect(data[2].amount).toBe(-1);
      expect(data[2].profit).toBe(-1);
      for (const key of fullSessionKeys) {
        expect(data[2]).not.toHaveProperty(key);
      }

      expect(data[3].type).toBe("jackpot");
      expect(data[3].amount).toBe(1);
      expect(data[3].profit).toBe(1);
      for (const key of fullSessionKeys) {
        expect(data[3]).not.toHaveProperty(key);
      }
    });

    it("passes filters to API client", async () => {
      const handler = tools.get("get_sessions")!;
      await handler({ start: "2026-01-01", type: "cashgame" });

      expect(client.fetchSessions).toHaveBeenCalledWith({
        start: "2026-01-01",
        type: "cashgame",
      });
    });

    it("returns error on API failure", async () => {
      vi.spyOn(client, "fetchSessions").mockRejectedValue(
        new PbtApiError("Rate limit exceeded", 429),
      );

      const handler = tools.get("get_sessions")!;
      const result = await handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Rate limit");
    });
  });

  describe("get_stats", () => {
    it("returns aggregate statistics", async () => {
      const handler = tools.get("get_stats")!;
      const result = await handler({});
      const data = JSON.parse(result.content[0].text);

      expect(data.totalSessions).toBe(2);
      expect(data.totalProfit).toBe(1300);
      expect(data.winRate).toBe(100);
      expect(data.avgSessionProfit).toBe(650);
      expect(data.currencies).toEqual(["USD"]);
    });

    it("includes location breakdown", async () => {
      const handler = tools.get("get_stats")!;
      const result = await handler({});
      const data = JSON.parse(result.content[0].text);

      expect(data.byLocation["Bellagio"]).toEqual({ sessions: 1, profit: 700 });
      expect(data.byLocation["Aria"]).toEqual({ sessions: 1, profit: 600 });
    });

    it("includes stakes breakdown for cash games only", async () => {
      const handler = tools.get("get_stats")!;
      const result = await handler({});
      const data = JSON.parse(result.content[0].text);

      expect(data.byStakes["NLH 1/2"]).toEqual({ sessions: 1, profit: 700 });
      expect(Object.keys(data.byStakes)).toHaveLength(1);
    });
  });
});
