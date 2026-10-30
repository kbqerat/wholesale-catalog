import type { Locale } from "./i18n/config";

/** Amount in MAD with Latin digits and up to 2 decimals ("12.5" -> "12,50"). */
export function formatPrice(value: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-MA" : "fr-MA", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
    numberingSystem: "latn",
  }).format(value);
}

/** Date and time in Morocco's time zone with Latin digits (server-rendered). */
export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : "fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Casablanca",
    numberingSystem: "latn",
  }).format(new Date(iso));
}
