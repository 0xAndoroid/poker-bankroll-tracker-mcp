import { z } from "zod";
import { SESSION_TYPES, type SessionFilters } from "./types.js";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const CURRENCY_PATTERN = /^[A-Za-z]{3}(,[A-Za-z]{3})*$/;

export const sessionFilterSchema = {
  start: z.string().describe("Start date (YYYY-MM-DD)").optional(),
  end: z.string().describe("End date (YYYY-MM-DD)").optional(),
  type: z
    .string()
    .describe(
      "Session type: cashgame, tournament, payout, costs, casinogame, jackpot (comma-separated)",
    )
    .optional(),
  currency: z.string().describe("Currency filter: ISO codes (comma-separated)").optional(),
  staking: z.boolean().describe("Filter by staking sessions").optional(),
};

export function parseDateFilter(value: string): string {
  if (!DATE_PATTERN.test(value)) {
    throw new Error(`Invalid date "${value}". Expected YYYY-MM-DD. See --help.`);
  }
  return value;
}

export function parseTypeFilter(value: string): string {
  const values = parseCommaList(value, "type");
  const allowed = new Set<string>(SESSION_TYPES);
  const invalid = values.filter((item) => !allowed.has(item));
  if (invalid.length > 0) {
    throw new Error(
      `Invalid type "${invalid.join(",")}". Allowed: ${SESSION_TYPES.join(",")}. See --help.`,
    );
  }
  return values.join(",");
}

export function parseCurrencyFilter(value: string): string {
  const normalized = value.toUpperCase();
  if (!CURRENCY_PATTERN.test(normalized)) {
    throw new Error(
      `Invalid currency "${value}". Expected comma-separated 3-letter ISO codes like USD,EUR. See --help.`,
    );
  }
  return normalized;
}

export function validateSessionFilters(filters: SessionFilters): SessionFilters {
  return {
    ...filters,
    start: filters.start == null ? undefined : parseDateFilter(filters.start),
    end: filters.end == null ? undefined : parseDateFilter(filters.end),
    type: filters.type == null ? undefined : parseTypeFilter(filters.type),
    currency: filters.currency == null ? undefined : parseCurrencyFilter(filters.currency),
  };
}

function parseCommaList(value: string, label: string): string[] {
  const values = value.split(",");
  if (values.some((item) => item.length === 0 || item.trim() !== item)) {
    throw new Error(
      `Invalid ${label} "${value}". Use comma-separated values without spaces. See --help.`,
    );
  }
  return values;
}
