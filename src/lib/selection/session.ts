import { z } from "zod";
import { isOrderRef } from "../order-link";
import { parseStoredSelection, selectionReducer, serializeSelection, type SelectionAction, type SelectionItem } from "./reducer";

/**
 * The client's current order: the list, the order number that belongs to it,
 * and the last order sent on WhatsApp.
 *
 * - The order number is created with the first product and kept until the
 *   list is sent or emptied, so the link the client sends always carries the
 *   number of exactly this list (nothing is swapped at click time).
 * - Sending empties the list: the next order starts from scratch with a new
 *   number, so it can never repeat a previous order's products or number.
 */

export type SentOrder = { ref: string; url: string; count: number };

export type SelectionSession = {
  items: SelectionItem[];
  ref: string | null;
  lastSent: SentOrder | null;
};

export const EMPTY_SESSION: SelectionSession = { items: [], ref: null, lastSent: null };

export function applySelectionAction(
  session: SelectionSession,
  action: SelectionAction,
  newRef: () => string,
): SelectionSession {
  const items = selectionReducer(session.items, action);
  if (items === session.items) return session;
  if (items.length === 0) return { items, ref: null, lastSent: session.lastSent };
  // A new list hides the "order sent" confirmation of the previous one.
  return { items, ref: session.ref ?? newRef(), lastSent: null };
}

/** The client tapped "send": remember what was sent and start a fresh list. */
export function markSent(session: SelectionSession, url: string): SelectionSession {
  if (!session.ref || session.items.length === 0) return session;
  return { items: [], ref: null, lastSent: { ref: session.ref, url, count: session.items.length } };
}

// ---------------------------------------------------------------------------
// Persistence (localStorage). Accepts the older format (a bare array of items).
// ---------------------------------------------------------------------------

const sentSchema = z.object({
  ref: z.string().refine(isOrderRef),
  url: z.string().max(5000).startsWith("https://wa.me/"),
  count: z.number().int().min(1).max(1000),
});

export function serializeSession(session: SelectionSession): string {
  return JSON.stringify({
    v: 2,
    ref: session.ref,
    items: JSON.parse(serializeSelection(session.items)),
    lastSent: session.lastSent,
  });
}

export function parseSession(raw: string | null, newRef: () => string): SelectionSession {
  if (!raw) return EMPTY_SESSION;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return EMPTY_SESSION;
  }
  // Older format: just the items.
  const stored = Array.isArray(data) ? { items: data } : (data as Record<string, unknown> | null);
  if (!stored || typeof stored !== "object") return EMPTY_SESSION;

  const items = parseStoredSelection(JSON.stringify(stored.items ?? []));
  const ref = items.length === 0 ? null : isOrderRef(stored.ref) ? stored.ref : newRef();
  const sent = sentSchema.safeParse(stored.lastSent);
  return { items, ref, lastSent: items.length === 0 && sent.success ? sent.data : null };
}
