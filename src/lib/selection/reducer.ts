import { z } from "zod";
import type { Product } from "../catalog/types";

export const MAX_QUANTITY = 10000;
export const MAX_ITEMS = 200;

export type ItemStatus = "ok" | "unavailable" | "removed";

/** Product details copied at add-time so the list renders offline/instantly. */
export type SelectionSnapshot = {
  productId: string;
  variantId: string | null;
  name_ar: string;
  name_fr: string | null;
  variant_ar: string | null;
  variant_fr: string | null;
  image: string | null;
};

export type SelectionItem = SelectionSnapshot & {
  key: string;
  quantity: number;
  /** Set after checking the list against the live catalog. */
  status: ItemStatus;
};

export type SelectionAction =
  | { type: "add"; item: SelectionSnapshot; quantity: number }
  | { type: "setQuantity"; key: string; quantity: number }
  | { type: "increment"; key: string }
  | { type: "decrement"; key: string }
  | { type: "remove"; key: string }
  | { type: "clear" }
  | { type: "replace"; items: SelectionItem[] }
  | { type: "reconcile"; products: Product[] };

export function itemKey(productId: string, variantId: string | null): string {
  return `${productId}:${variantId ?? "-"}`;
}

/** Coerce any user input to a valid quantity: an integer from 1 to MAX_QUANTITY. */
export function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(value)));
}

export function selectionReducer(items: SelectionItem[], action: SelectionAction): SelectionItem[] {
  switch (action.type) {
    case "add": {
      if (!Number.isFinite(action.quantity) || action.quantity <= 0) return items;
      const key = itemKey(action.item.productId, action.item.variantId);
      const existing = items.find((i) => i.key === key);
      if (existing) {
        return items.map((i) =>
          i.key === key
            ? {
                ...i,
                ...action.item,
                quantity: clampQuantity(i.quantity + Math.floor(action.quantity)),
                status: "ok",
              }
            : i,
        );
      }
      if (items.length >= MAX_ITEMS) return items;
      return [
        ...items,
        {
          ...action.item,
          key,
          quantity: clampQuantity(action.quantity),
          status: "ok",
        },
      ];
    }
    case "setQuantity": {
      // Ignore non-numeric input (e.g. an empty field while typing).
      if (!Number.isFinite(action.quantity)) return items;
      return updateItem(items, action.key, (i) => ({
        ...i,
        quantity: clampQuantity(action.quantity),
      }));
    }
    case "increment":
      return updateItem(items, action.key, (i) => ({
        ...i,
        quantity: clampQuantity(i.quantity + 1),
      }));
    case "decrement":
      // Never drops below 1; removing is an explicit action.
      return updateItem(items, action.key, (i) => ({
        ...i,
        quantity: clampQuantity(i.quantity - 1),
      }));
    case "remove":
      return items.filter((i) => i.key !== action.key);
    case "clear":
      return items.length === 0 ? items : [];
    case "replace":
      return action.items;
    case "reconcile":
      return reconcile(items, action.products);
  }
}

function updateItem(
  items: SelectionItem[],
  key: string,
  update: (item: SelectionItem) => SelectionItem,
): SelectionItem[] {
  let changed = false;
  const next = items.map((i) => {
    if (i.key !== key) return i;
    const updated = update(i);
    if (updated.quantity !== i.quantity) changed = true;
    return updated;
  });
  return changed ? next : items;
}

/** Refresh names/photos/availability from the live catalog. */
function reconcile(items: SelectionItem[], products: Product[]): SelectionItem[] {
  const byId = new Map(products.map((p) => [p.id, p]));
  return items.map((item) => {
    const product = byId.get(item.productId);
    if (!product) return { ...item, status: "removed" };
    const variant = item.variantId ? product.variants.find((v) => v.id === item.variantId) : null;
    if (item.variantId && !variant) return { ...item, status: "removed" };
    const available = product.is_available && (variant ? variant.is_available : true);
    return {
      ...item,
      ...snapshotFromProduct(product, variant?.id ?? null),
      status: available ? "ok" : "unavailable",
    };
  });
}

export function snapshotFromProduct(product: Product, variantId: string | null): SelectionSnapshot {
  const variant = variantId ? product.variants.find((v) => v.id === variantId) : undefined;
  return {
    productId: product.id,
    variantId: variant?.id ?? null,
    name_ar: product.name_ar,
    name_fr: product.name_fr,
    variant_ar: variant?.label_ar ?? null,
    variant_fr: variant?.label_fr ?? null,
    image: product.images[0] ?? null,
  };
}

export type SelectionSummary = {
  /** Items that will be included in the order sent on WhatsApp. */
  sendable: SelectionItem[];
  itemCount: number;
  unitCount: number;
};

export function summarize(items: SelectionItem[]): SelectionSummary {
  const sendable = items.filter((i) => i.status === "ok");
  const unitCount = sendable.reduce((n, item) => n + item.quantity, 0);
  return { sendable, itemCount: sendable.length, unitCount };
}

// ---------------------------------------------------------------------------
// Persistence format (localStorage). Anything malformed is dropped, so a
// corrupted or tampered value can never crash the page.
// ---------------------------------------------------------------------------

export const STORAGE_KEY = "wholesale-selection:v1";

const storedItemSchema = z.object({
  productId: z.string().min(1).max(64),
  variantId: z.string().min(1).max(64).nullable(),
  name_ar: z.string().max(200),
  name_fr: z.string().max(200).nullable(),
  variant_ar: z.string().max(100).nullable(),
  variant_fr: z.string().max(100).nullable(),
  image: z.string().max(500).nullable(),
  quantity: z.number(),
});

export function parseStoredSelection(raw: string | null): SelectionItem[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const items: SelectionItem[] = [];
  const seen = new Set<string>();
  for (const entry of data.slice(0, MAX_ITEMS)) {
    const parsed = storedItemSchema.safeParse(entry);
    if (!parsed.success) continue;
    const key = itemKey(parsed.data.productId, parsed.data.variantId);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({
      ...parsed.data,
      key,
      quantity: clampQuantity(parsed.data.quantity),
      status: "ok",
    });
  }
  return items;
}

export function serializeSelection(items: SelectionItem[]): string {
  // Status is re-derived from the live catalog, so it is not persisted.
  return JSON.stringify(items.map(({ key: _key, status: _status, ...rest }) => rest));
}
