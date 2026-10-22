export const locales = ["ar", "fr"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ar";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Replace `{name}` placeholders in a dictionary string. */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

/** Pick the localized field, falling back to Arabic (always required). */
export function pickLocalized(locale: Locale, ar: string, fr: string | null | undefined): string;
export function pickLocalized(
  locale: Locale,
  ar: string | null | undefined,
  fr: string | null | undefined,
): string | null;
export function pickLocalized(
  locale: Locale,
  ar: string | null | undefined,
  fr: string | null | undefined,
): string | null {
  if (locale === "fr" && fr && fr.trim()) return fr;
  return ar && ar.trim() ? ar : (fr ?? null);
}
