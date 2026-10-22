import { interpolate } from "./i18n/config";
import type { Dictionary } from "./i18n/dictionaries/ar";

/**
 * Normalise a configured WhatsApp number to the international digits-only
 * form wa.me expects (e.g. "+212 6 12-34-56-78" -> "212612345678").
 * A Moroccan local number ("0612345678") is converted to +212.
 * Returns `null` when the value is missing or not a plausible number.
 */
export function normalizeWhatsAppNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.trim().replace(/[\s\-().]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("00")) digits = digits.slice(2);
  else if (/^0[5-7]\d{8}$/.test(digits)) digits = `212${digits.slice(1)}`;
  return /^[1-9]\d{7,14}$/.test(digits) ? digits : null;
}

/**
 * The WhatsApp message is deliberately short: a greeting, the link to the
 * order page (every product with its photo and quantity) and the order number.
 * Prices are agreed with the seller in the conversation.
 */
export function buildWhatsAppMessage({
  orderUrl,
  orderRef,
  dict,
}: {
  orderUrl: string;
  orderRef?: string;
  dict: Pick<Dictionary, "whatsapp">;
}): string {
  const w = dict.whatsapp;
  const lines = [w.greeting, w.intro, orderUrl, ""];
  if (orderRef) lines.push(interpolate(w.ref, { ref: orderRef }));
  lines.push(w.closing);
  return lines.join("\n");
}

export function buildWhatsAppUrl(number: string, message: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
