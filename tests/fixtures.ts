import type { Product } from "@/lib/catalog/types";
import type { SelectionItem, SelectionSnapshot } from "@/lib/selection/reducer";
import { itemKey } from "@/lib/selection/reducer";

export const CAP_ID = "11111111-1111-4111-8111-111111111111";
export const BAG_ID = "22222222-2222-4222-8222-222222222222";
export const BLACK_ID = "33333333-3333-4333-8333-333333333333";
export const WHITE_ID = "44444444-4444-4444-8444-444444444444";

export function product(overrides: Partial<Product> = {}): Product {
  return {
    id: CAP_ID,
    category_id: "c1",
    name_ar: "قبعة",
    name_fr: "Casquette",
    description_ar: null,
    description_fr: null,
    is_available: true,
    in_stock: true,
    is_published: true,
    sort_order: 0,
    updated_at: "2026-10-19T00:00:00Z",
    images: [],
    image_paths: [],
    variants: [
      { id: BLACK_ID, label_ar: "أسود", label_fr: "Noir", color_hex: "#000000", is_available: true, sort_order: 0 },
      { id: WHITE_ID, label_ar: "أبيض", label_fr: "Blanc", color_hex: null, is_available: true, sort_order: 1 },
    ],
    ...overrides,
  };
}

export function snapshot(overrides: Partial<SelectionSnapshot> = {}): SelectionSnapshot {
  return {
    productId: CAP_ID,
    variantId: BLACK_ID,
    name_ar: "قبعة",
    name_fr: "Casquette",
    variant_ar: "أسود",
    variant_fr: "Noir",
    image: null,
    ...overrides,
  };
}

export function item(overrides: Partial<SelectionItem> = {}): SelectionItem {
  const base = snapshot(overrides);
  return {
    ...base,
    key: itemKey(base.productId, base.variantId),
    quantity: 1,
    status: "ok",
    ...overrides,
  };
}
