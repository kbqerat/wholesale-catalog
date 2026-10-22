import { describe, expect, it } from "vitest";
import { createOrderRef, isOrderRef } from "@/lib/order-link";
import { itemKey } from "@/lib/selection/reducer";
import {
  EMPTY_SESSION,
  applySelectionAction,
  markSent,
  parseSession,
  serializeSession,
  type SelectionSession,
} from "@/lib/selection/session";
import { BAG_ID, CAP_ID, snapshot } from "./fixtures";

const lacoste = snapshot({ productId: CAP_ID, variantId: null, name_ar: "Lacoste", name_fr: "Lacoste" });
const gucci = snapshot({ productId: BAG_ID, variantId: null, name_ar: "Gucci", name_fr: "Gucci" });
const add = (s: SelectionSession, item = lacoste, quantity = 1) =>
  applySelectionAction(s, { type: "add", item, quantity }, createOrderRef);

describe("client order session", () => {
  it("gives a list its order number with the first product and keeps it while editing", () => {
    const s1 = add(EMPTY_SESSION);
    expect(isOrderRef(s1.ref)).toBe(true);
    const s2 = applySelectionAction(s1, { type: "setQuantity", key: itemKey(CAP_ID, null), quantity: 9 }, createOrderRef);
    const s3 = add(s2, gucci);
    expect(s3.ref).toBe(s1.ref);
  });

  it("drops the number when the list is emptied", () => {
    const s = applySelectionAction(add(EMPTY_SESSION), { type: "clear" }, createOrderRef);
    expect(s).toEqual({ items: [], ref: null, lastSent: null });
  });

  it("bug report #1: after sending Lacoste, picking Gucci sends ONLY Gucci", () => {
    const sentLacoste = markSent(add(EMPTY_SESSION, lacoste, 2), "https://wa.me/212600000000?text=a");
    expect(sentLacoste.items).toEqual([]);
    const next = add(sentLacoste, gucci, 3);
    expect(next.items.map((i) => i.name_fr)).toEqual(["Gucci"]);
  });

  it("bug report #2: the second order gets a NEW order number", () => {
    const first = add(EMPTY_SESSION);
    const afterSend = markSent(first, "https://wa.me/212600000000?text=a");
    const second = add(afterSend, gucci);
    expect(second.ref).not.toBe(first.ref);
    expect(isOrderRef(second.ref)).toBe(true);
  });

  it("remembers the last sent order until a new list is started", () => {
    const first = add(EMPTY_SESSION);
    const sent = markSent(first, "https://wa.me/212600000000?text=a");
    expect(sent.lastSent).toEqual({ ref: first.ref, url: "https://wa.me/212600000000?text=a", count: 1 });
    expect(add(sent).lastSent).toBeNull();
  });

  it("ignores send on an empty list", () => {
    expect(markSent(EMPTY_SESSION, "https://wa.me/1")).toBe(EMPTY_SESSION);
  });
});

describe("session persistence", () => {
  it("round-trips list, number and last sent order", () => {
    const s = add(add(EMPTY_SESSION), gucci, 4);
    const restored = parseSession(serializeSession(s), () => "SHOULDNOT");
    expect(restored.ref).toBe(s.ref);
    expect(restored.items).toEqual(s.items);
    const sent = markSent(s, "https://wa.me/212600000000?text=x");
    expect(parseSession(serializeSession(sent), createOrderRef)).toEqual(sent);
  });

  it("reads the older format (bare array) and gives it a number", () => {
    const old = JSON.stringify([{ ...lacoste, quantity: 3 }]);
    const s = parseSession(old, () => "ABCDEFGH");
    expect(s.items).toHaveLength(1);
    expect(s.ref).toBe("ABCDEFGH");
  });

  it("never trusts a tampered last-sent link", () => {
    const raw = JSON.stringify({ v: 2, ref: null, items: [], lastSent: { ref: "ABCDEFGH", url: "javascript:alert(1)", count: 1 } });
    expect(parseSession(raw, createOrderRef).lastSent).toBeNull();
  });

  it("survives corrupted storage", () => {
    expect(parseSession("{", createOrderRef)).toEqual(EMPTY_SESSION);
    expect(parseSession("null", createOrderRef)).toEqual(EMPTY_SESSION);
    expect(parseSession('{"items":"x"}', createOrderRef)).toEqual(EMPTY_SESSION);
  });
});
