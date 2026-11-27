import type { Replay, ReplayFilters, Session, SessionFilters } from "./types.js";
import { AuthError, NetworkError, PbtApiError, RateLimitError } from "./errors.js";

const BASE_URL = "https://api.pokerbankrolltracker.net/v1";
const CACHE_TTL_MS = 10 * 1000;

interface CacheEntry<T> {
  data: T[];
  timestamp: number;
}

export class PbtApiClient {
  private readonly apiKey: string;
  private readonly sessionsCache = new Map<string, CacheEntry<Session>>();
  private readonly replaysCache = new Map<string, CacheEntry<Replay>>();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  fetchSessions({ id, start, end, type, currency, staking }: SessionFilters = {}): Promise<
    Session[]
  > {
    return this.fetchData(
      "sessions",
      { id, start, end, type, currency, staking },
      this.sessionsCache,
    );
  }

  fetchReplays({ id, start, end, private: privacy, hub }: ReplayFilters = {}): Promise<Replay[]> {
    return this.fetchData("replays", { id, start, end, private: privacy, hub }, this.replaysCache);
  }

  clearCache(): void {
    this.sessionsCache.clear();
    this.replaysCache.clear();
  }

  private async fetchData<T>(
    endpoint: "sessions" | "replays",
    filters: Record<string, string | number | boolean | undefined>,
    cache: Map<string, CacheEntry<T>>,
  ): Promise<T[]> {
    const url = new URL(`${BASE_URL}/${endpoint}`);
    for (const [name, value] of Object.entries(filters)) {
      if (value != null && value !== "") url.searchParams.set(name, String(value));
    }
    const cacheKey = url.search;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
    } catch (error) {
      throw new NetworkError(error);
    }

    if (response.status === 401 || response.status === 403) throw new AuthError();
    if (response.status === 429) throw new RateLimitError();
    if (!response.ok) {
      throw new PbtApiError(
        `API returned ${response.status}: ${response.statusText}`,
        response.status,
      );
    }

    const body: unknown = await response.json().catch(() => {
      throw new PbtApiError("API returned invalid JSON.");
    });
    if (
      typeof body !== "object" ||
      body === null ||
      !("data" in body) ||
      !Array.isArray(body.data)
    ) {
      throw new PbtApiError("API response is missing a data array.");
    }
    const data = body.data as T[];
    cache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  }
}
