import { describe, expect, it } from "vitest";
import {
  parseCurrencyFilter,
  parseDateFilter,
  parseIdFilter,
  parseTypeFilter,
  validateSessionFilters,
} from "./filters.js";

describe("filter parsing", () => {
  it("accepts only positive safe integers in decimal notation as IDs", () => {
    expect(parseIdFilter("42")).toBe(42);
    for (const id of ["0", "-1", " 1", "1e2", "1.5", "9007199254740992"]) {
      expect(() => parseIdFilter(id)).toThrow(/Invalid ID/);
    }
  });

  it("accepts valid calendar dates", () => {
    expect(parseDateFilter("2026-02-28")).toBe("2026-02-28");
    expect(parseDateFilter("2024-02-29")).toBe("2024-02-29");
  });

  it("rejects malformed and impossible dates", () => {
    expect(() => parseDateFilter("20260228")).toThrow(/Expected YYYY-MM-DD/);
    expect(() => parseDateFilter("2026-13-01")).toThrow(/Invalid date/);
    expect(() => parseDateFilter("2026-02-29")).toThrow(/Invalid date/);
    expect(() => parseDateFilter("2026-04-31")).toThrow(/Invalid date/);
  });

  it("validates and normalizes CSV filters", () => {
    expect(parseTypeFilter("cashgame,tournament")).toBe("cashgame,tournament");
    expect(parseCurrencyFilter("usd,eur")).toBe("USD,EUR");
    expect(() => parseTypeFilter("cashgame,invalid")).toThrow(/Invalid type/);
    expect(() => parseCurrencyFilter("USD, EUR")).toThrow(/Invalid currency/);
  });

  it("validates session filters without dropping false staking", () => {
    expect(
      validateSessionFilters({
        start: "2026-01-01",
        end: "2026-12-31",
        type: "cashgame",
        currency: "usd",
        staking: false,
      }),
    ).toEqual({
      start: "2026-01-01",
      end: "2026-12-31",
      type: "cashgame",
      currency: "USD",
      staking: false,
    });
  });
});
