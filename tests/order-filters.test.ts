import { describe, expect, it } from "vitest";
import { dayEnd, dayStart, hasActiveFilters, orderFiltersQuery, parseOrderFilters } from "@/lib/admin/order-filters";

describe("order filters", () => {
  it("defaults to every order, first page", () => {
    const filters = parseOrderFilters({});
    expect(filters).toEqual({ status: "all", from: null, to: null, page: 1 });
    expect(hasActiveFilters(filters)).toBe(false);
    expect(orderFiltersQuery(filters)).toBe("");
  });

  it("reads status, dates and page from the URL", () => {
    const filters = parseOrderFilters({ status: "cancelled", from: "2026-10-01", to: "2026-10-22", page: "3" });
    expect(filters).toEqual({ status: "cancelled", from: "2026-10-01", to: "2026-10-22", page: 3 });
    expect(orderFiltersQuery(filters)).toBe("?status=cancelled&from=2026-10-01&to=2026-10-22&page=3");
    expect(orderFiltersQuery(filters, 1)).toBe("?status=cancelled&from=2026-10-01&to=2026-10-22");
  });

  it("ignores invalid values instead of failing", () => {
    expect(
      parseOrderFilters({ status: "deleted", from: "2026-02-30", to: "yesterday", page: ["-2", "5"] }),
    ).toEqual({ status: "all", from: null, to: null, page: 1 });
    expect(parseOrderFilters({ from: "", to: "", page: "1.5" })).toEqual({
      status: "all",
      from: null,
      to: null,
      page: 1,
    });
  });

  it("swaps a reversed date range", () => {
    expect(parseOrderFilters({ from: "2026-10-22", to: "2026-10-01" })).toMatchObject({
      from: "2026-10-01",
      to: "2026-10-22",
    });
  });

  it("uses whole days in Morocco time", () => {
    // Morocco is UTC+1 most of the year: the day starts at 23:00 UTC the day before.
    expect(dayStart("2026-10-22")).toBe("2026-10-21T23:00:00.000Z");
    expect(dayEnd("2026-10-22")).toBe("2026-10-22T23:00:00.000Z");
    expect(dayEnd("2026-12-31")).toBe("2026-12-31T23:00:00.000Z");
  });
});
