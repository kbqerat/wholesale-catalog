export type Category = {
  id: string;
  slug: string;
  name_ar: string;
  name_fr: string;
  sort_order: number;
};

export type Variant = {
  id: string;
  label_ar: string;
  label_fr: string | null;
  color_hex: string | null;
  is_available: boolean;
  sort_order: number;
};

export type Product = {
  id: string;
  category_id: string;
  name_ar: string;
  name_fr: string | null;
  description_ar: string | null;
  description_fr: string | null;
  /**
   * In the public catalog: manual switch AND stock > 0 (see getCatalog).
   * In the admin: the seller's manual switch only.
   */
  is_available: boolean;
  /** Derived in the database: stock_quantity > 0. */
  in_stock: boolean;
  is_published: boolean;
  sort_order: number;
  /** Last change in the database (ISO timestamp). */
  updated_at: string;
  variants: Variant[];
  /** Public image URLs, cover first. */
  images: string[];
  /** Storage paths matching `images` (used by the admin form). */
  image_paths: string[];
};

/** Admin-only view of a product: includes the private stock level. */
export type AdminProduct = Product & { stock_quantity: number };

export type OrderItem = {
  product_id: string;
  name_ar: string;
  name_fr: string | null;
  quantity: number;
  /** Units actually taken from stock (less than quantity if stock was short). */
  deducted: number;
};

export type Order = {
  id: string;
  ref: string;
  status: "confirmed" | "cancelled";
  items: OrderItem[];
  confirmed_at: string;
  cancelled_at: string | null;
};

export type Catalog = {
  categories: Category[];
  products: Product[];
  /** True when Supabase is not configured and built-in sample data is shown. */
  isSample: boolean;
};
