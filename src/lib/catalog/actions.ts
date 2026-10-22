"use server";

import { z } from "zod";
import { getCatalog } from "./queries";
import { MAX_ITEMS } from "../selection/reducer";
import type { Product } from "./types";

const idsSchema = z.array(z.string().max(64)).max(MAX_ITEMS);

/**
 * Current data (availability, names, photos) for the products in a client's
 * selection list. Read-only and limited to published products.
 */
export async function getSelectionProducts(ids: unknown): Promise<Product[]> {
  const parsed = idsSchema.safeParse(ids);
  if (!parsed.success) return [];
  const wanted = new Set(parsed.data);
  const catalog = await getCatalog();
  return catalog.products.filter((p) => wanted.has(p.id));
}
