import { MAX_ITEMS, clampQuantity, type SelectionItem } from "./selection/reducer";

/**
 * A client's selection encoded in a link, so the seller can open a page with
 * the photo of every product the client asked about (WhatsApp links can only
 * carry text). Nothing is stored: the page re-reads the live catalog.
 *
 * Link: /{locale}/o/{orderRef}/{items}
 *   items = entries joined by "-", each `id.quantity` or `id.variantId.quantity`,
 *   ids written as 32 hex characters (UUID without dashes).
 * Only letters, digits, ".", "-" and "/" are used: no query string, nothing
 * WhatsApp treats as formatting, nothing copy/paste or link detection drops.
 *
 * Reading is tolerant on purpose: older links (/order?i=…&r=…, dashed ids
 * joined by "_") are still understood, even after WhatsApp stripped the "_"
 * (italics) or the "&r=" got lost — every `id.quantity` found is recovered.
 */

export type OrderLine = { productId: string; variantId: string | null; quantity: number };

const DASHED = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const HEX32 = "[0-9a-f]{32}";
const ID = `(?:${DASHED}|${HEX32})`;
// The quantity ends at the next id, a non-hex character, or the end.
const ITEM = new RegExp(`(${ID})(?:\\.(${ID}))?\\.(\\d{1,6}?)(?=${DASHED}|[^0-9a-f]|$)`, "gi");

const compact = (id: string) => id.replace(/-/g, "").toLowerCase();
const expand = (id: string) => {
  const hex = compact(id);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};

export function encodeOrder(items: Pick<SelectionItem, "productId" | "variantId" | "quantity">[]): string {
  return items
    .slice(0, MAX_ITEMS)
    .map((i) =>
      [compact(i.productId), i.variantId === null ? null : compact(i.variantId), i.quantity]
        .filter((part) => part !== null)
        .join("."),
    )
    .join("-");
}

export function decodeOrder(value: string | null | undefined): OrderLine[] {
  if (!value || value.length > 20000) return [];
  const lines: OrderLine[] = [];
  const seen = new Set<string>();
  for (const match of value.matchAll(ITEM)) {
    if (lines.length >= MAX_ITEMS) break;
    const productId = expand(match[1]);
    const variantId = match[2] ? expand(match[2]) : null;
    const key = `${productId}:${variantId ?? "-"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lines.push({ productId, variantId, quantity: clampQuantity(Number(match[3])) });
  }
  return lines;
}

/** Order number from an old `?i=…&r=…` link, even if "&r=" was mangled into "…5rK7PQ2M9X". */
export function recoverLegacyRef(r: unknown, i: unknown): string | null {
  if (isOrderRef(r)) return r;
  const tail = typeof i === "string" ? /r([A-Z0-9]{8})$/.exec(i) : null;
  return tail && isOrderRef(tail[1]) ? tail[1] : null;
}

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I

/**
 * Short order number (e.g. "K7PQ2M9X") added to each list a client sends, so
 * the seller can confirm it exactly once and talk about it with the client.
 */
export function createOrderRef(random: (bytes: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b)): string {
  const bytes = random(new Uint8Array(8));
  return Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
}

export function isOrderRef(value: unknown): value is string {
  return typeof value === "string" && /^[A-Z0-9]{8}$/.test(value);
}

export function orderPath(locale: string, items: Parameters<typeof encodeOrder>[0], ref: string): string {
  return `/${locale}/o/${ref}/${encodeOrder(items)}`;
}
