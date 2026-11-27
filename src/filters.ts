import { z } from "zod";
import { SESSION_TYPES, type EntryFilters, type SessionFilters } from "./types.js";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CURRENCY_PATTERN = /^[A-Za-z]{3}(,[A-Za-z]{3})*$/;

export class FilterValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FilterValidationError";
  }
}

const idSchema = z.int().positive();

const entryFilterSchema = {
  id: idSchema.describe("ID of a specific entry (positive integer)").optional(),
  start: z.string().describe("Start date (YYYY-MM-DD)").optional(),
  end: z.string().describe("End date (YYYY-MM-DD)").optional(),
};

export const sessionFilterSchema = {
  ...entryFilterSchema,
  type: z
    .string()
    .describe(
      "Session type: cashgame, tournament, payout, costs, casinogame, jackpot (comma-separated)",
    )
    .optional(),
  currency: z.string().describe("Currency filter: ISO codes (comma-separated)").optional(),
  staking: z.boolean().describe("Filter by staking status (true or false)").optional(),
};

export const replayFilterSchema = {
  ...entryFilterSchema,
  private: z.boolean().describe("Filter by whether the replay is private").optional(),
  hub: z
    .boolean()
    .describe("Filter by whether the replay is published in the analysis hub")
    .optional(),
};

export function parseIdFilter(value: string): number {
  const id = Number(value);
  if (!/^[1-9][0-9]*$/.test(value) || !idSchema.safeParse(id).success) {
    throw new FilterValidationError(
      "Invalid ID. Expected a positive safe integer in decimal notation.",
    );
  }
  return id;
}

export function parseDateFilter(value: string): string {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    throw new FilterValidationError(`Invalid date "${value}". Expected YYYY-MM-DD.`);
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) {
    throw new FilterValidationError(
      `Invalid date "${value}". Expected real calendar date in YYYY-MM-DD.`,
    );
  }
  return value;
}

export function parseTypeFilter(value: string): string {
  const values = parseCommaList(value, "type");
  const allowed = new Set<string>(SESSION_TYPES);
  const invalid = values.filter((item) => !allowed.has(item));
  if (invalid.length > 0) {
    throw new FilterValidationError(
      `Invalid type "${invalid.join(",")}". Allowed: ${SESSION_TYPES.join(",")}.`,
    );
  }
  return values.join(",");
}

export function parseCurrencyFilter(value: string): string {
  const normalized = value.toUpperCase();
  if (!CURRENCY_PATTERN.test(normalized)) {
    throw new FilterValidationError(
      `Invalid currency "${value}". Expected comma-separated 3-letter ISO codes like USD,EUR.`,
    );
  }
  return normalized;
}

export function validateSessionFilters(filters: SessionFilters): SessionFilters {
  return {
    ...validateDateFilters(filters),
    type: filters.type == null ? undefined : parseTypeFilter(filters.type),
    currency: filters.currency == null ? undefined : parseCurrencyFilter(filters.currency),
  };
}

export function validateDateFilters<T extends EntryFilters>(filters: T): T {
  return {
    ...filters,
    start: filters.start == null ? undefined : parseDateFilter(filters.start),
    end: filters.end == null ? undefined : parseDateFilter(filters.end),
  };
}

function parseCommaList(value: string, label: string): string[] {
  const values = value.split(",");
  if (values.some((item) => item.length === 0 || item.trim() !== item)) {
    throw new FilterValidationError(
      `Invalid ${label} "${value}". Use comma-separated values without spaces.`,
    );
  }
  return values;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
