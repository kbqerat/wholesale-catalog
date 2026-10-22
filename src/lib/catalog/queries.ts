import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "../supabase/server";
import { getSupabaseEnv } from "../supabase/env";
import { CATEGORY_COLUMNS, PRODUCT_COLUMNS, mapCategories, mapProducts } from "./mappers";
import { SAMPLE_CATALOG } from "./sample-data";
import type { Catalog, Product } from "./types";

export const CATALOG_TAG = "catalog";

/**
 * The public catalog: categories plus published products (RLS enforces the
 * "published only" rule). Cached and invalidated by admin mutations via
 * `updateTag(CATALOG_TAG)`; the short lifetime also picks up edits made
 * directly in the Supabase dashboard.
 */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("minutes");

  const env = getSupabaseEnv();
  const supabase = createPublicClient();
  if (!env || !supabase) return SAMPLE_CATALOG;

  const [categories, products] = await Promise.all([
    supabase.from("categories").select(CATEGORY_COLUMNS).order("sort_order").order("name_ar"),
    supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("is_published", true)
      .order("sort_order")
      .order("created_at", { ascending: false }),
  ]);
  if (categories.error) throw new Error(`Failed to load categories: ${categories.error.message}`);
  if (products.error) throw new Error(`Failed to load products: ${products.error.message}`);

  return {
    isSample: false,
    categories: mapCategories(categories.data),
    // A product with no stock left is unavailable automatically, and becomes
    // available again as soon as the seller restocks it.
    products: mapProducts(products.data, env).map((p) => ({ ...p, is_available: p.is_available && p.in_stock })),
  };
}

export async function getProduct(id: string): Promise<Product | null> {
  const catalog = await getCatalog();
  return catalog.products.find((p) => p.id === id) ?? null;
}
