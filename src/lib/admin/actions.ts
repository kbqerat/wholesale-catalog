"use server";

import { redirect } from "next/navigation";
import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { getAdminContext } from "./auth";
import { CATALOG_TAG } from "../catalog/queries";
import { createSessionClient } from "../supabase/server";
import { PRODUCT_IMAGES_BUCKET } from "../supabase/env";
import { defaultLocale, isLocale, type Locale } from "../i18n/config";
import type { Dictionary } from "../i18n/dictionaries/ar";
import {
  categorySchema,
  productSchema,
  slugify,
  stockSchema,
  toFieldErrors,
  type FieldErrors,
} from "../validation/admin";

type AdminMessage = keyof Dictionary["admin"];

export type FormState =
  | { status: "idle" }
  | { status: "error"; message: AdminMessage; fieldErrors?: FieldErrors }
  | { status: "success" };

function localeFrom(formData: FormData): Locale {
  const value = formData.get("locale");
  return isLocale(value) ? value : defaultLocale;
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const credentialsSchema = z.object({
  email: z.email().max(320),
  password: z.string().min(1).max(200),
});

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = localeFrom(formData);
  const parsed = credentialsSchema.safeParse({
    email: text(formData, "email").trim(),
    password: text(formData, "password"),
  });
  if (!parsed.success) return { status: "error", message: "invalidCredentials" };

  const supabase = await createSessionClient();
  if (!supabase) return { status: "error", message: "notConfiguredTitle" };

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { status: "error", message: "invalidCredentials" };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) {
    await supabase.auth.signOut();
    return { status: "error", message: "notAdmin" };
  }
  redirect(`/${locale}/admin`);
}

export async function signOutAction(formData: FormData): Promise<void> {
  const locale = localeFrom(formData);
  const supabase = await createSessionClient();
  await supabase?.auth.signOut();
  redirect(`/${locale}/admin/login`);
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function saveProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const locale = localeFrom(formData);
  const context = await getAdminContext();
  if (!context) return { status: "error", message: "unauthorized" };

  let payload: unknown;
  try {
    payload = JSON.parse(text(formData, "payload"));
  } catch {
    return { status: "error", message: "saveFailed" };
  }
  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) {
    return { status: "error", message: "formHasErrors", fieldErrors: toFieldErrors(parsed.error) };
  }

  const { data, error } = await context.supabase.rpc("admin_save_product", { payload: parsed.data });
  if (error) {
    console.error("admin_save_product failed", error);
    if (error.code === "23503") {
      return { status: "error", message: "formHasErrors", fieldErrors: { category_id: "invalid" } };
    }
    return { status: "error", message: error.code === "42501" ? "unauthorized" : "saveFailed" };
  }

  const removed = (data as { removed_paths?: string[] } | null)?.removed_paths ?? [];
  await removeImages(context.supabase, removed);

  updateTag(CATALOG_TAG);
  redirect(`/${locale}/admin`);
}

const idSchema = z.uuid();

export async function deleteProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await getAdminContext();
  if (!context) return { status: "error", message: "unauthorized" };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "deleteFailed" };

  const { data: images } = await context.supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", id.data);

  const { error } = await context.supabase.from("products").delete().eq("id", id.data);
  if (error) {
    console.error("delete product failed", error);
    return { status: "error", message: "deleteFailed" };
  }
  await removeImages(
    context.supabase,
    (images ?? []).map((i) => i.storage_path as string),
  );

  updateTag(CATALOG_TAG);
  refresh();
  return { status: "success" };
}

/** Quick restock from the low-stock page: only changes the stock level. */
export async function updateStockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await getAdminContext();
  if (!context) return { status: "error", message: "unauthorized" };
  const id = idSchema.safeParse(formData.get("id"));
  const stock = stockSchema.safeParse(text(formData, "stock_quantity"));
  if (!id.success) return { status: "error", message: "saveFailed" };
  if (!stock.success) {
    return { status: "error", message: "formHasErrors", fieldErrors: toFieldErrors(stock.error) };
  }

  const { data, error } = await context.supabase
    .from("products")
    .update({ stock_quantity: stock.data })
    .eq("id", id.data)
    .select("id");
  if (error || !data?.length) {
    if (error) console.error("update stock failed", error);
    return { status: "error", message: "saveFailed" };
  }
  // Stock decides public availability (in_stock), so refresh the catalog too.
  updateTag(CATALOG_TAG);
  refresh();
  return { status: "success" };
}

// ---------------------------------------------------------------------------
// Orders: the seller confirms a client's WhatsApp order -> stock is deducted.
// ---------------------------------------------------------------------------

const confirmSchema = z.object({
  ref: z.string().regex(/^[A-Z0-9]{8}$/),
  items: z
    .array(z.object({ product_id: z.uuid(), quantity: z.number().int().min(1).max(10000) }))
    .min(1)
    .max(200),
});

export async function confirmOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await getAdminContext();
  if (!context) return { status: "error", message: "unauthorized" };

  let items: unknown;
  try {
    items = JSON.parse(text(formData, "items"));
  } catch {
    return { status: "error", message: "confirmFailed" };
  }
  const parsed = confirmSchema.safeParse({ ref: text(formData, "ref"), items });
  if (!parsed.success) return { status: "error", message: "confirmFailed" };

  // One line per product (quantities of duplicates are added together).
  const merged = new Map<string, number>();
  for (const line of parsed.data.items) {
    merged.set(line.product_id, Math.min(10000, (merged.get(line.product_id) ?? 0) + line.quantity));
  }
  const { error } = await context.supabase.rpc("admin_confirm_order", {
    p_ref: parsed.data.ref,
    p_items: [...merged].map(([product_id, quantity]) => ({ product_id, quantity })),
  });
  if (error) {
    console.error("admin_confirm_order failed", error);
    if (error.message.includes("already_confirmed") || error.code === "23505") {
      return { status: "error", message: "orderAlreadyConfirmed" };
    }
    return { status: "error", message: error.code === "42501" ? "unauthorized" : "confirmFailed" };
  }

  // Stock may have hit 0, which changes public availability.
  updateTag(CATALOG_TAG);
  refresh();
  return { status: "success" };
}

export async function cancelOrderAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await getAdminContext();
  if (!context) return { status: "error", message: "unauthorized" };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "cancelFailed" };

  const { error } = await context.supabase.rpc("admin_cancel_order", { p_order_id: id.data });
  if (error) {
    console.error("admin_cancel_order failed", error);
    return { status: "error", message: error.code === "42501" ? "unauthorized" : "cancelFailed" };
  }
  updateTag(CATALOG_TAG);
  refresh();
  return { status: "success" };
}

type SessionClient = NonNullable<Awaited<ReturnType<typeof createSessionClient>>>;

async function removeImages(supabase: SessionClient, paths: string[]) {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
  // The rows are already gone; an orphaned file is harmless, so only log it.
  if (error) console.error("failed to remove product images", error);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function saveCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await getAdminContext();
  if (!context) return { status: "error", message: "unauthorized" };

  const parsed = categorySchema.safeParse({
    id: text(formData, "id") || null,
    name_ar: text(formData, "name_ar"),
    name_fr: text(formData, "name_fr"),
  });
  if (!parsed.success) {
    return { status: "error", message: "formHasErrors", fieldErrors: toFieldErrors(parsed.error) };
  }
  const { id, ...values } = parsed.data;

  // Editing keeps the existing link identifier so shared links keep working.
  let error = id ? (await context.supabase.from("categories").update(values).eq("id", id)).error : null;
  if (!id) {
    // New category: derive a unique identifier from the French name.
    const base = slugify(values.name_fr) || "categorie";
    for (let attempt = 0; attempt < 5; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
      ({ error } = await context.supabase.from("categories").insert({ ...values, slug }));
      if (error?.code !== "23505") break; // 23505: identifier already used
    }
  }

  if (error) {
    console.error("save category failed", error);
    return { status: "error", message: "saveFailed" };
  }

  updateTag(CATALOG_TAG);
  refresh();
  return { status: "success" };
}

export async function deleteCategoryAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const context = await getAdminContext();
  if (!context) return { status: "error", message: "unauthorized" };
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return { status: "error", message: "deleteFailed" };

  const { error } = await context.supabase.from("categories").delete().eq("id", id.data);
  if (error) {
    console.error("delete category failed", error);
    // 23503: foreign key violation -> the category still has products.
    return { status: "error", message: error.code === "23503" ? "categoryInUse" : "deleteFailed" };
  }

  updateTag(CATALOG_TAG);
  refresh();
  return { status: "success" };
}
