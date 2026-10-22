/**
 * Filters and pagination of the confirmed-orders list, read from the URL
 * (?status=cancelled&from=2026-10-01&to=2026-10-22&page=2) so a filtered page
 * can be bookmarked, shared and navigated with the back button.
 */

export const ORDERS_PER_PAGE = 20;

export const ORDER_STATUSES = ["all", "confirmed", "cancelled"] as const;
export type OrderStatusFilter = (typeof ORDER_STATUSES)[number];

export type OrderFilters = {
  status: OrderStatusFilter;
  /** Days (YYYY-MM-DD) in the shop's time zone, both included. */
  from: string | null;
  to: string | null;
  page: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

function parseDay(value: string | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) ? value : null;
}

export function parseOrderFilters(params: SearchParams): OrderFilters {
  const status = first(params.status);
  let from = parseDay(first(params.from));
  let to = parseDay(first(params.to));
  if (from && to && from > to) [from, to] = [to, from];
  const page = Number(first(params.page));
  return {
    status: ORDER_STATUSES.includes(status as OrderStatusFilter) ? (status as OrderStatusFilter) : "all",
    from,
    to,
    page: Number.isInteger(page) && page >= 1 && page <= 100000 ? page : 1,
  };
}

/** Query string for these filters (defaults left out), e.g. "?status=cancelled&page=2". */
export function orderFiltersQuery(filters: OrderFilters, page = filters.page): string {
  const query = new URLSearchParams();
  if (filters.status !== "all") query.set("status", filters.status);
  if (filters.from) query.set("from", filters.from);
  if (filters.to) query.set("to", filters.to);
  if (page > 1) query.set("page", String(page));
  const text = query.toString();
  return text ? `?${text}` : "";
}

export function hasActiveFilters(filters: OrderFilters): boolean {
  return filters.status !== "all" || filters.from !== null || filters.to !== null;
}

export const SHOP_TIME_ZONE = "Africa/Casablanca";

/** UTC offset of the shop's time zone around a day, e.g. "+01:00" (Morocco moves to +00:00 during Ramadan). */
function offsetOn(day: string): string {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: SHOP_TIME_ZONE, timeZoneName: "longOffset" })
    .formatToParts(new Date(`${day}T12:00:00Z`))
    .find((p) => p.type === "timeZoneName")?.value;
  const match = name && /GMT([+-]\d{2}:\d{2})/.exec(name);
  return match ? match[1] : "+00:00";
}

/** The instant a shop-time day starts, as an ISO timestamp. */
export function dayStart(day: string): string {
  return new Date(`${day}T00:00:00${offsetOn(day)}`).toISOString();
}

/** The instant the day after `day` starts (exclusive upper bound). */
export function dayEnd(day: string): string {
  const next = new Date(`${day}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return dayStart(next.toISOString().slice(0, 10));
}
