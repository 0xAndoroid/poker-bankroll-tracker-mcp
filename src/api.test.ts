import { describe, it, expect, vi, beforeEach } from "vitest";
import { PbtApiClient } from "./api.js";
import { AuthError, RateLimitError, NetworkError, PbtApiError } from "./errors.js";
import type { Session } from "./types.js";

const MOCK_SESSION: Session = {
  id: 1,
  type: "cashgame",
  start: "2026-03-15 19:00:00",
  end: "2026-03-16 03:00:00",
  location: "Bellagio",
  location_type: "Casino",
  currency: "USD",
  buyin: 500,
  cashout: 1200,
  rebuys: 0,
  rebuy_cost: 0,
  expenses: 0,
  expenses_in_chips: 0,
  exchange_rate: 1,
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
};

function mockFetchOk(data: Session[]) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ data }),
  });
}

function mockFetchStatus(status: number) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: "Error",
    json: () => Promise.resolve({}),
  });
}

describe("PbtApiClient", () => {
  let client: PbtApiClient;

  beforeEach(() => {
    client = new PbtApiClient("test-api-key");
    client.clearCache();
    vi.restoreAllMocks();
  });

  it("fetches sessions with auth header", async () => {
    const fetchSpy = mockFetchOk([MOCK_SESSION]);
    vi.stubGlobal("fetch", fetchSpy);

    const sessions = await client.fetchSessions();

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url.toString()).toBe("https://api.pokerbankrolltracker.net/v1/sessions");
    expect(init.headers.Authorization).toBe("Bearer test-api-key");
    expect(sessions).toEqual([MOCK_SESSION]);
  });

  it("passes query params from filters", async () => {
    vi.stubGlobal("fetch", mockFetchOk([]));

    await client.fetchSessions({
      start: "2026-01-01",
      end: "2026-03-31",
      type: "cashgame,tournament",
      currency: "USD",
      staking: false,
    });

    const [url] = vi.mocked(fetch).mock.calls[0];
    const params = new URL(url.toString()).searchParams;
    expect(params.get("start")).toBe("2026-01-01");
    expect(params.get("end")).toBe("2026-03-31");
    expect(params.get("type")).toBe("cashgame,tournament");
    expect(params.get("currency")).toBe("USD");
    expect(params.get("staking")).toBe("false");
  });

  it("omits undefined filters from query", async () => {
    vi.stubGlobal("fetch", mockFetchOk([]));

    await client.fetchSessions({ start: "2026-01-01" });

    const [url] = vi.mocked(fetch).mock.calls[0];
    const params = new URL(url.toString()).searchParams;
    expect(params.get("start")).toBe("2026-01-01");
    expect(params.has("end")).toBe(false);
    expect(params.has("type")).toBe(false);
    expect(params.has("currency")).toBe(false);
    expect(params.has("staking")).toBe(false);
  });

  it("throws AuthError on 401", async () => {
    vi.stubGlobal("fetch", mockFetchStatus(401));
    await expect(client.fetchSessions()).rejects.toThrow(AuthError);
  });

  it("throws AuthError on 403", async () => {
    vi.stubGlobal("fetch", mockFetchStatus(403));
    await expect(client.fetchSessions()).rejects.toThrow(AuthError);
  });

  it("throws RateLimitError on 429", async () => {
    vi.stubGlobal("fetch", mockFetchStatus(429));
    await expect(client.fetchSessions()).rejects.toThrow(RateLimitError);
  });

  it("throws PbtApiError on other HTTP errors", async () => {
    vi.stubGlobal("fetch", mockFetchStatus(500));
    await expect(client.fetchSessions()).rejects.toThrow(PbtApiError);
  });

  it("throws NetworkError on fetch failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(client.fetchSessions()).rejects.toThrow(NetworkError);
  });

  it("returns cached results within TTL", async () => {
    const fetchSpy = mockFetchOk([MOCK_SESSION]);
    vi.stubGlobal("fetch", fetchSpy);

    const first = await client.fetchSessions({ start: "2026-01-01" });
    const second = await client.fetchSessions({ start: "2026-01-01" });

    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(first).toEqual(second);
  });

  it("does not mix cache across different filters", async () => {
    const fetchSpy = mockFetchOk([MOCK_SESSION]);
    vi.stubGlobal("fetch", fetchSpy);

    await client.fetchSessions({ start: "2026-01-01" });
    await client.fetchSessions({ start: "2026-02-01" });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("refetches after cache is cleared", async () => {
    const fetchSpy = mockFetchOk([MOCK_SESSION]);
    vi.stubGlobal("fetch", fetchSpy);

    await client.fetchSessions();
    client.clearCache();
    await client.fetchSessions();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
