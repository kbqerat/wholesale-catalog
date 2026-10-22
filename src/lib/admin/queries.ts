import "server-only";
import { ADMIN_PRODUCT_COLUMNS, CATEGORY_COLUMNS, mapProduct, mapProducts } from "../catalog/mappers";
import { LOW_STOCK_THRESHOLD } from "../stock";
import { ORDERS_PER_PAGE, dayEnd, dayStart, type OrderFilters } from "./order-filters";
import { getSupabaseEnv } from "../supabase/env";
import type { AdminProduct, Category, Order } from "../catalog/types";
import type { getAdminContext } from "./auth";

type AdminClient = NonNullable<Awaited<ReturnType<typeof getAdminContext>>>["supabase"];

/** Uncached reads for the admin area (includes unpublished products). */
export async function getAdminProducts(supabase: AdminClient): Promise<AdminProduct[]> {
  const env = getSupabaseEnv()!;
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_COLUMNS)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load products: ${error.message}`);
  return mapProducts(data, env) as AdminProduct[];
}

export async function getAdminProduct(supabase: AdminClient, id: string): Promise<AdminProduct | null> {
  const env = getSupabaseEnv()!;
  const { data, error } = await supabase.from("products").select(ADMIN_PRODUCT_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load product: ${error.message}`);
  return data ? (mapProduct(data as never, env) as AdminProduct) : null;
}

/** Products at or below the low-stock threshold, lowest stock first. */
export async function getLowStockProducts(supabase: AdminClient): Promise<AdminProduct[]> {
  const env = getSupabaseEnv()!;
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_PRODUCT_COLUMNS)
    .lte("stock_quantity", LOW_STOCK_THRESHOLD)
    .order("stock_quantity")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load low-stock products: ${error.message}`);
  return mapProducts(data, env) as AdminProduct[];
}

export async function countLowStockProducts(supabase: AdminClient): Promise<number> {
  const { count, error } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .lte("stock_quantity", LOW_STOCK_THRESHOLD);
  // The badge is informative only; never break the admin layout over it.
  return error ? 0 : (count ?? 0);
}

export type CategoryWithCount = Category & { product_count: number };

export async function getAdminCategories(supabase: AdminClient): Promise<CategoryWithCount[]> {
  const { data, error } = await supabase
    .from("categories")
    .select(`${CATEGORY_COLUMNS}, products(count)`)
    .order("sort_order")
    .order("name_ar");
  if (error) throw new Error(`Failed to load categories: ${error.message}`);
  return (data as (Category & { products: { count: number }[] })[]).map(({ products, ...c }) => ({
    ...c,
    product_count: products?.[0]?.count ?? 0,
  }));
}

export async function getAdminProductsByIds(supabase: AdminClient, ids: string[]): Promise<AdminProduct[]> {
  if (ids.length === 0) return [];
  const env = getSupabaseEnv()!;
  const { data, error } = await supabase.from("products").select(ADMIN_PRODUCT_COLUMNS).in("id", ids);
  if (error) throw new Error(`Failed to load products: ${error.message}`);
  return mapProducts(data, env) as AdminProduct[];
}

const ORDER_COLUMNS = "id, ref, status, items, confirmed_at, cancelled_at";

function mapOrder(row: Order): Order {
  return row;
}

export async function getOrderByRef(supabase: AdminClient, ref: string): Promise<Order | null> {
  const { data, error } = await supabase.from("orders").select(ORDER_COLUMNS).eq("ref", ref).maybeSingle();
  if (error) throw new Error(`Failed to load order: ${error.message}`);
  return data ? mapOrder(data as never) : null;
}

/** One page of orders matching the filters, newest first, with the total count. */
export async function getOrders(
  supabase: AdminClient,
  filters: OrderFilters,
): Promise<{ orders: Order[]; total: number }> {
  const filtered = (columns: string, options: { count: "exact"; head?: boolean }) => {
    let query = supabase.from("orders").select(columns, options);
    if (filters.status !== "all") query = query.eq("status", filters.status);
    if (filters.from) query = query.gte("confirmed_at", dayStart(filters.from));
    if (filters.to) query = query.lt("confirmed_at", dayEnd(filters.to));
    return query;
  };
  const offset = (filters.page - 1) * ORDERS_PER_PAGE;
  const { data, error, count } = await filtered(ORDER_COLUMNS, { count: "exact" })
    .order("confirmed_at", { ascending: false })
    .order("id")
    .range(offset, offset + ORDERS_PER_PAGE - 1);
  // Past the last page (e.g. a stale link): no rows, but report the total so
  // the page can send the seller to the last page.
  if (error?.code === "PGRST103") {
    const total = await filtered("id", { count: "exact", head: true });
    if (total.error) throw new Error(`Failed to count orders: ${total.error.message}`);
    return { orders: [], total: total.count ?? 0 };
  }
  if (error) throw new Error(`Failed to load orders: ${error.message}`);
  return { orders: (data as never[]).map(mapOrder), total: count ?? 0 };
}
