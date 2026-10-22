import { describe, expect, it } from "vitest";
import { filterProducts, normalizeSearch } from "@/lib/search";
import type { Category } from "@/lib/catalog/types";
import { BAG_ID, product } from "./fixtures";

const categories: Category[] = [
  { id: "c1", slug: "caps", name_ar: "قبعات", name_fr: "Casquettes", sort_order: 1 },
  { id: "c2", slug: "bags", name_ar: "حقائب", name_fr: "Sacs", sort_order: 2 },
];

const products = [
  product(),
  product({ id: BAG_ID, category_id: "c2", name_ar: "حقيبة ظهر", name_fr: "Sac à dos", variants: [] }),
];

describe("normalizeSearch", () => {
  it("ignores French accents and case", () => {
    expect(normalizeSearch("Sac À DOS Élégant")).toBe("sac a dos elegant");
  });
  it("unifies Arabic letter variants and strips diacritics", () => {
    expect(normalizeSearch("أَحْمَر")).toBe(normalizeSearch("احمر"));
    expect(normalizeSearch("حقيبة")).toBe(normalizeSearch("حقيبه"));
    expect(normalizeSearch("إطار")).toBe("اطار");
  });
});

describe("filterProducts", () => {
  const run = (query: string, categorySlug: string | null = null) =>
    filterProducts(products, categories, { query, categorySlug }).map((p) => p.id);

  it("filters by category", () => {
    expect(run("", "bags")).toEqual([BAG_ID]);
  });
  it("searches names in both languages", () => {
    expect(run("sac a dos")).toEqual([BAG_ID]);
    expect(run("حقيبه")).toEqual([BAG_ID]);
  });
  it("searches variant labels and category names", () => {
    expect(run("noir")).toEqual([products[0].id]);
    expect(run("casquettes")).toEqual([products[0].id]);
  });
  it("requires every word to match", () => {
    expect(run("sac noir")).toEqual([]);
  });
});
