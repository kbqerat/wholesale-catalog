"use client";

import { useSyncExternalStore } from "react";
import { createOrderRef } from "../order-link";
import { STORAGE_KEY, type SelectionAction } from "./reducer";
import {
  EMPTY_SESSION,
  applySelectionAction,
  markSent,
  parseSession,
  serializeSession,
  type SelectionSession,
} from "./session";

/**
 * A tiny external store around the client's order (list + order number),
 * persisted in localStorage so it survives refreshes and later visits.
 *
 * localStorage is the source of truth: every change starts from what is
 * stored now, not from this tab's copy. A tab that missed an update (another
 * tab sent the order while this one was in the background, frozen or in the
 * back/forward cache) would otherwise add products to the old, already sent
 * list and reuse its order number.
 */

export type SelectionState = SelectionSession & { hydrated: boolean };

const SERVER_STATE: SelectionState = { ...EMPTY_SESSION, hydrated: false };

let state: SelectionState | null = null;
const listeners = new Set<() => void>();

function read(): SelectionSession {
  try {
    return parseSession(window.localStorage.getItem(STORAGE_KEY), createOrderRef);
  } catch {
    return EMPTY_SESSION; // Storage blocked (private mode, disabled cookies…)
  }
}

function write(session: SelectionSession) {
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeSession(session));
  } catch {
    // Keep working in memory if storage is unavailable.
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function getSnapshot(): SelectionState {
  if (state === null) state = { ...read(), hydrated: true };
  return state;
}

function getServerSnapshot(): SelectionState {
  return SERVER_STATE;
}

/** Re-read the stored order; re-renders only if it differs from this tab's copy. */
function sync() {
  const current = getSnapshot();
  const stored = read();
  if (serializeSession(stored) === serializeSession(current)) return current;
  state = { ...stored, hydrated: true };
  emit();
  return state;
}

function onStorage(event: StorageEvent) {
  if (event.key === STORAGE_KEY || event.key === null) sync();
}

function onVisible() {
  if (document.visibilityState === "visible") sync();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", sync); // Back/forward cache restores.
    document.addEventListener("visibilitychange", onVisible);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", sync);
      document.removeEventListener("visibilitychange", onVisible);
    }
  };
}

function commit(current: SelectionSession, next: SelectionSession) {
  if (next === current) return;
  state = { ...next, hydrated: true };
  write(next);
  emit();
}

export function dispatchSelection(action: SelectionAction) {
  const current = sync();
  commit(current, applySelectionAction(current, action, createOrderRef));
}

/**
 * Called when the client taps "send on WhatsApp" with the exact link used.
 * The empty list is saved right away, so even if the page is suspended or
 * closed while WhatsApp opens, the next order starts fresh with a new number.
 * Only the re-render waits, so the browser can first follow the link.
 */
export function markSelectionSent(whatsappUrl: string) {
  const current = sync();
  const next = markSent(current, whatsappUrl);
  if (next === current) return;
  write(next);
  setTimeout(sync, 0);
}

export function useSelection(): SelectionState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
