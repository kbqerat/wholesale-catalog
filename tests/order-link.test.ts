import { describe, expect, it } from "vitest";
import { createOrderRef, decodeOrder, encodeOrder, isOrderRef, orderPath, recoverLegacyRef } from "@/lib/order-link";
import { MAX_QUANTITY } from "@/lib/selection/reducer";
import { BAG_ID, BLACK_ID, CAP_ID } from "./fixtures";

describe("order link", () => {
  const items = [
    { productId: CAP_ID, variantId: BLACK_ID, quantity: 12 },
    { productId: BAG_ID, variantId: null, quantity: 3 },
  ];
  const hex = (id: string) => id.replace(/-/g, "");

  it("round-trips products, variants and quantities", () => {
    expect(decodeOrder(encodeOrder(items))).toEqual(items);
  });

  it("uses only characters WhatsApp never treats as formatting", () => {
    const encoded = encodeOrder([...items, { productId: CAP_ID, variantId: null, quantity: 1 }]);
    expect(encoded).toMatch(/^[0-9a-f.-]+$/);
    expect(encoded).not.toMatch(/[_*~`]/);
    expect(encodeURIComponent(encoded)).toBe(encoded);
  });

  it("builds a path-only link (no ?, = or &)", () => {
    const path = orderPath("ar", items, "K7PQ2M9X");
    expect(path).toBe(`/ar/o/K7PQ2M9X/${hex(CAP_ID)}.${hex(BLACK_ID)}.12-${hex(BAG_ID)}.3`);
    expect(path).toMatch(/^[A-Za-z0-9./-]+$/);
  });

  it("recovers the damaged link from the bug report", () => {
    // "/ar/order?i=0dc65114-…cf3a.5&r=MPC8K5H3" arrived as below ("&r=" lost, "000" added).
    const i = "0000dc65114-a17c-4baa-b8a9-de96ce21cf3a.5rMPC8K5H3";
    expect(decodeOrder(i)).toEqual([
      { productId: "0dc65114-a17c-4baa-b8a9-de96ce21cf3a", variantId: null, quantity: 5 },
    ]);
    expect(recoverLegacyRef(null, i)).toBe("MPC8K5H3");
    expect(recoverLegacyRef("K7PQ2M9X", i)).toBe("K7PQ2M9X");
  });

  it("recovers old links whose _ separators WhatsApp removed (italics)", () => {
    expect(decodeOrder(`${CAP_ID}.${BLACK_ID}.12${BAG_ID}.3`)).toEqual(items);
    expect(decodeOrder(`${CAP_ID}.1${BAG_ID}.16`)).toEqual([
      { productId: CAP_ID, variantId: null, quantity: 1 },
      { productId: BAG_ID, variantId: null, quantity: 16 },
    ]);
  });

  it("still reads links sent with the first format (dashed ids joined by _)", () => {
    expect(decodeOrder(`${CAP_ID}.${BLACK_ID}.12_${BAG_ID}.3`)).toEqual(items);
    expect(decodeOrder(`${CAP_ID}.5`)).toEqual([{ productId: CAP_ID, variantId: null, quantity: 5 }]);
  });

  it("ignores malformed or tampered parts and duplicates", () => {
    const raw = [`${hex(CAP_ID)}.5`, "nothex.3", `${hex(BAG_ID)}.abc`, `${hex(BAG_ID)}.zz.2`, `${hex(CAP_ID)}.9`, ""].join("-");
    expect(decodeOrder(raw)).toEqual([{ productId: CAP_ID, variantId: null, quantity: 5 }]);
    expect(decodeOrder(null)).toEqual([]);
    expect(decodeOrder("")).toEqual([]);
  });

  it("clamps quantities to the allowed range", () => {
    expect(decodeOrder(`${hex(CAP_ID)}.0`)[0].quantity).toBe(1);
    expect(decodeOrder(`${hex(CAP_ID)}.999999`)[0].quantity).toBe(MAX_QUANTITY);
  });
});

describe("order number", () => {
  it("is 8 unambiguous characters", () => {
    for (let i = 0; i < 200; i++) {
      const ref = createOrderRef();
      expect(isOrderRef(ref)).toBe(true);
      expect(ref).not.toMatch(/[01OI]/);
    }
  });

  it("is random per send", () => {
    const refs = new Set(Array.from({ length: 500 }, () => createOrderRef()));
    expect(refs.size).toBe(500);
  });

  it("is part of the order link", () => {
    const items = [{ productId: CAP_ID, variantId: null, quantity: 2 }];
    const id = CAP_ID.replace(/-/g, "");
    expect(orderPath("fr", items, "K7PQ2M9X")).toBe(`/fr/o/K7PQ2M9X/${id}.2`);
  });

  it("rejects malformed numbers", () => {
    for (const bad of ["", "k7pq2m9x", "K7PQ2M9", "K7PQ2M9X1", "K7PQ-M9X", null, 12345678]) {
      expect(isOrderRef(bad)).toBe(false);
    }
  });
});
