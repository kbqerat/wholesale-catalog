import type { Dictionary } from "@/lib/i18n/dictionaries/ar";

/** Translate a validation/server error code from either dictionary section. */
export function errorText(dict: Dictionary, code: string | undefined): string | undefined {
  if (!code) return undefined;
  const errors = dict.errors as Record<string, string>;
  const admin = dict.admin as Record<string, string>;
  return errors[code] ?? admin[code] ?? dict.errors.invalid;
}
