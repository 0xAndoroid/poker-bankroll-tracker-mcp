import type { Session, SessionsResponse, SessionFilters } from "./types.js";
import { AuthError, NetworkError, PbtApiError, RateLimitError } from "./errors.js";

const BASE_URL = "https://api.pokerbankrolltracker.net/v1";
const CACHE_TTL_MS = 10 * 1000;

interface CacheEntry {
  sessions: Session[];
  timestamp: number;
}

export class PbtApiClient {
  private readonly apiKey: string;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchSessions(filters: SessionFilters = {}): Promise<Session[]> {
    const cacheKey = JSON.stringify(filters);
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.sessions;
    }

    const url = new URL(`${BASE_URL}/sessions`);
    if (filters.start) url.searchParams.set("start", filters.start);
    if (filters.end) url.searchParams.set("end", filters.end);
    if (filters.type) url.searchParams.set("type", filters.type);
    if (filters.currency) url.searchParams.set("currency", filters.currency);
    if (filters.staking !== undefined) {
      url.searchParams.set("staking", String(filters.staking));
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

    const body = (await response.json()) as SessionsResponse;
    this.cache.set(cacheKey, { sessions: body.data, timestamp: Date.now() });
    return body.data;
  }
}
