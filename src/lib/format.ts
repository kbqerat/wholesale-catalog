import type { Locale } from "./i18n/config";

/** Date and time in Morocco's time zone with Latin digits (server-rendered). */
export function formatDateTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-MA" : "fr-MA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Casablanca",
    numberingSystem: "latn",
  }).format(new Date(iso));
}
