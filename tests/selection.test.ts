import { describe, expect, it } from "vitest";
import {
  MAX_ITEMS,
  MAX_QUANTITY,
  clampQuantity,
  itemKey,
  parseStoredSelection,
  selectionReducer,
  serializeSelection,
  summarize,
} from "@/lib/selection/reducer";
import { BAG_ID, BLACK_ID, CAP_ID, WHITE_ID, item, product, snapshot } from "./fixtures";

describe("clampQuantity", () => {
  it("keeps valid integers", () => {
    expect(clampQuantity(5)).toBe(5);
  });
  it("raises values below 1 to 1", () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(-4)).toBe(1);
  });
  it("caps at MAX_QUANTITY", () => {
    expect(clampQuantity(MAX_QUANTITY + 1)).toBe(MAX_QUANTITY);
  });
  it("floors decimals and handles non-finite input", () => {
    expect(clampQuantity(7.9)).toBe(7);
    expect(clampQuantity(Number.NaN)).toBe(1);
    expect(clampQuantity(Number.POSITIVE_INFINITY)).toBe(1);
  });
});

describe("selectionReducer: add", () => {
  it("adds a new item with its key", () => {
    const items = selectionReducer([], { type: "add", item: snapshot(), quantity: 3 });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ key: itemKey(CAP_ID, BLACK_ID), quantity: 3, status: "ok" });
  });

  it("merges quantities when the same product + variant is added again", () => {
    let items = selectionReducer([], { type: "add", item: snapshot(), quantity: 3 });
    items = selectionReducer(items, { type: "add", item: snapshot(), quantity: 4 });
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(7);
  });

  it("keeps different variants of the same product as separate lines", () => {
    let items = selectionReducer([], { type: "add", item: snapshot(), quantity: 1 });
    items = selectionReducer(items, {
      type: "add",
      item: snapshot({ variantId: WHITE_ID, variant_ar: "أبيض", variant_fr: "Blanc" }),
      quantity: 2,
    });
    expect(items.map((i) => i.quantity)).toEqual([1, 2]);
  });

  it("accepts a single unit", () => {
    const items = selectionReducer([], { type: "add", item: snapshot(), quantity: 1 });
    expect(items[0].quantity).toBe(1);
  });

  it("never exceeds MAX_QUANTITY when merging", () => {
    let items = selectionReducer([], { type: "add", item: snapshot(), quantity: MAX_QUANTITY - 1 });
    items = selectionReducer(items, { type: "add", item: snapshot(), quantity: 50 });
    expect(items[0].quantity).toBe(MAX_QUANTITY);
  });

  it("ignores zero, negative and non-numeric quantities", () => {
    const start = [item()];
    for (const quantity of [0, -3, Number.NaN]) {
      expect(selectionReducer(start, { type: "add", item: snapshot(), quantity })).toBe(start);
    }
  });

  it("refuses to grow beyond MAX_ITEMS lines", () => {
    const full = Array.from({ length: MAX_ITEMS }, (_, i) =>
      item({ productId: `p-${i}`, variantId: null, key: itemKey(`p-${i}`, null) }),
    );
    const next = selectionReducer(full, { type: "add", item: snapshot({ productId: "new" }), quantity: 1 });
    expect(next).toBe(full);
  });
});

describe("selectionReducer: quantity updates", () => {
  const key = itemKey(CAP_ID, BLACK_ID);

  it("sets an explicit quantity", () => {
    const items = selectionReducer([item()], { type: "setQuantity", key, quantity: 40 });
    expect(items[0].quantity).toBe(40);
  });

  it("clamps an explicit quantity between 1 and the maximum", () => {
    const start = [item({ quantity: 10 })];
    expect(selectionReducer(start, { type: "setQuantity", key, quantity: 0 })[0].quantity).toBe(1);
    expect(selectionReducer(start, { type: "setQuantity", key, quantity: 1e9 })[0].quantity).toBe(MAX_QUANTITY);
  });

  it("ignores non-numeric input such as an empty field", () => {
    const start = [item({ quantity: 10 })];
    expect(selectionReducer(start, { type: "setQuantity", key, quantity: Number.NaN })).toBe(start);
  });

  it("increments and decrements by one", () => {
    let items = [item({ quantity: 5 })];
    items = selectionReducer(items, { type: "increment", key });
    expect(items[0].quantity).toBe(6);
    items = selectionReducer(items, { type: "decrement", key });
    items = selectionReducer(items, { type: "decrement", key });
    expect(items[0].quantity).toBe(4);
  });

  it("does not decrement below 1 (removal is explicit)", () => {
    const start = [item({ quantity: 1 })];
    const next = selectionReducer(start, { type: "decrement", key });
    expect(next).toBe(start);
    expect(next[0].quantity).toBe(1);
  });

  it("returns the same array for unknown keys", () => {
    const start = [item()];
    expect(selectionReducer(start, { type: "increment", key: "missing" })).toBe(start);
  });
});

describe("selectionReducer: remove and clear", () => {
  it("removes only the targeted line", () => {
    const start = [item(), item({ productId: BAG_ID, variantId: null, key: itemKey(BAG_ID, null) })];
    const next = selectionReducer(start, { type: "remove", key: itemKey(CAP_ID, BLACK_ID) });
    expect(next.map((i) => i.productId)).toEqual([BAG_ID]);
  });

  it("clears the list", () => {
    expect(selectionReducer([item()], { type: "clear" })).toEqual([]);
  });
});

describe("selectionReducer: reconcile with live catalog", () => {
  it("updates names from the catalog and keeps the quantity", () => {
    const next = selectionReducer([item({ quantity: 2 })], {
      type: "reconcile",
      products: [product({ name_fr: "Casquette v2" })],
    });
    expect(next[0]).toMatchObject({ name_fr: "Casquette v2", quantity: 2, status: "ok" });
  });

  it("marks items unavailable when the product or variant is out of stock", () => {
    const outOfStock = selectionReducer([item()], { type: "reconcile", products: [product({ is_available: false })] });
    expect(outOfStock[0].status).toBe("unavailable");

    const p = product();
    p.variants[0].is_available = false;
    const variantOut = selectionReducer([item()], { type: "reconcile", products: [p] });
    expect(variantOut[0].status).toBe("unavailable");
  });

  it("marks items removed when the product or variant no longer exists", () => {
    expect(selectionReducer([item()], { type: "reconcile", products: [] })[0].status).toBe("removed");
    const withoutVariant = product({ variants: [] });
    expect(selectionReducer([item()], { type: "reconcile", products: [withoutVariant] })[0].status).toBe("removed");
  });

  it("restores an item to ok when it becomes available again", () => {
    const next = selectionReducer([item({ status: "unavailable" })], { type: "reconcile", products: [product()] });
    expect(next[0].status).toBe("ok");
  });
});

describe("summarize", () => {
  it("counts products and units", () => {
    const s = summarize([
      item({ quantity: 3 }),
      item({ productId: BAG_ID, variantId: null, key: "b", quantity: 3 }),
    ]);
    expect(s.unitCount).toBe(6);
    expect(s.itemCount).toBe(2);
  });

  it("excludes unavailable and removed items from the counts", () => {
    const s = summarize([
      item({ quantity: 2 }),
      item({ key: "x", status: "unavailable", quantity: 100 }),
      item({ key: "y", status: "removed", quantity: 100 }),
    ]);
    expect(s.sendable.map((i) => i.key)).toEqual([itemKey(CAP_ID, BLACK_ID)]);
    expect(s.unitCount).toBe(2);
  });
});

describe("persistence", () => {
  it("round-trips through serialize/parse", () => {
    const items = [item({ quantity: 24 }), item({ productId: BAG_ID, variantId: null, key: itemKey(BAG_ID, null) })];
    expect(parseStoredSelection(serializeSelection(items))).toEqual(items);
  });

  it("does not persist the derived status", () => {
    const raw = serializeSelection([item({ status: "unavailable" })]);
    expect(raw).not.toContain("status");
    expect(parseStoredSelection(raw)[0].status).toBe("ok");
  });

  it("loads lists saved by older versions (with prices and minimum quantity)", () => {
    const old = JSON.stringify([{ ...snapshot(), unitPrice: null, minQuantity: 12, quantity: 12 }]);
    const [loaded] = parseStoredSelection(old);
    expect(loaded).toMatchObject({ quantity: 12 });
    expect(loaded).not.toHaveProperty("minQuantity");
    expect(loaded).not.toHaveProperty("unitPrice");
  });

  it("returns an empty list for missing or corrupted storage", () => {
    expect(parseStoredSelection(null)).toEqual([]);
    expect(parseStoredSelection("not json")).toEqual([]);
    expect(parseStoredSelection('{"a":1}')).toEqual([]);
  });

  it("drops malformed entries, de-duplicates and clamps quantities", () => {
    const good = { ...snapshot(), quantity: 0 };
    const raw = JSON.stringify([good, { ...good, quantity: 5 }, { productId: 42 }, null, { ...snapshot({ productId: "other" }), name_ar: 42, quantity: 1 }]);
    const parsed = parseStoredSelection(raw);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].quantity).toBe(1);
  });
});
