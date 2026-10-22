import type { Product, Category } from "./catalog/types";

/**
 * Normalise text for forgiving search in Arabic and French:
 * lower-case, strip French accents and Arabic diacritics/tatweel, and unify
 * common Arabic letter variants (أ/إ/آ -> ا, ة -> ه, ى -> ي).
 */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, " ")
    .trim();
}

export function filterProducts(
  products: Product[],
  categories: Category[],
  { query, categorySlug }: { query: string; categorySlug: string | null },
): Product[] {
  const category = categorySlug ? categories.find((c) => c.slug === categorySlug) : null;
  const terms = normalizeSearch(query).split(" ").filter(Boolean);
  const categoryNames = new Map(categories.map((c) => [c.id, `${c.name_ar} ${c.name_fr}`]));

  return products.filter((p) => {
    if (category && p.category_id !== category.id) return false;
    if (terms.length === 0) return true;
    const haystack = normalizeSearch(
      [
        p.name_ar,
        p.name_fr,
        p.description_ar,
        p.description_fr,
        categoryNames.get(p.category_id),
        ...p.variants.flatMap((v) => [v.label_ar, v.label_fr]),
      ]
        .filter(Boolean)
        .join(" "),
    );
    return terms.every((t) => haystack.includes(t));
  });
}
