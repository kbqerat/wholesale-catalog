import type { Dictionary } from "./i18n/dictionaries/ar";

/** Optional store name from the environment, otherwise a generic label. */
export function storeName(dict: Dictionary): string {
  return process.env.NEXT_PUBLIC_STORE_NAME?.trim() || dict.meta.defaultStoreName;
}

export function whatsappNumberSetting(): string | undefined {
  return process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;
}
