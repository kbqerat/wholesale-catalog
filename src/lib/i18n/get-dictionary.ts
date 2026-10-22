import "server-only";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/ar";

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  ar: () => import("./dictionaries/ar").then((m) => m.default),
  fr: () => import("./dictionaries/fr").then((m) => m.default),
};

export function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]();
}

export type { Dictionary };
