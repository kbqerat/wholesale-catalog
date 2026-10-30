import { publicImageUrl, type SupabaseEnv } from "../supabase/env";
import type { Category, Product, Variant } from "./types";

export const CATEGORY_COLUMNS = "id, slug, name_ar, name_fr, sort_order";

export const PRODUCT_COLUMNS = `
  id, category_id, name_ar, name_fr, description_ar, description_fr, wholesale_price,
  is_available, stock_quantity, in_stock, is_published, sort_order, updated_at,
  product_variants (id, label_ar, label_fr, color_hex, is_available, sort_order),
  product_images (storage_path, sort_order)
`;

export const ADMIN_PRODUCT_COLUMNS = PRODUCT_COLUMNS;

type ProductRow = Omit<Product, "variants" | "images" | "image_paths"> & {
  product_variants: Variant[] | null;
  product_images: { storage_path: string; sort_order: number }[] | null;
};

const bySortOrder = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order;

export function mapProduct(row: ProductRow, env: SupabaseEnv): Product {
  const { product_variants, product_images, ...rest } = row;
  const paths = [...(product_images ?? [])].sort(bySortOrder).map((i) => i.storage_path);
  return {
    ...rest,
    // numeric columns may arrive as strings depending on the driver.
    wholesale_price: rest.wholesale_price == null ? null : Number(rest.wholesale_price),
    variants: [...(product_variants ?? [])].sort(bySortOrder),
    image_paths: paths,
    images: paths.map((p) => publicImageUrl(env, p)),
  };
}

export function mapProducts(rows: unknown[], env: SupabaseEnv): Product[] {
  return (rows as ProductRow[]).map((r) => mapProduct(r, env));
}

export function mapCategories(rows: unknown[]): Category[] {
  return rows as Category[];
}
