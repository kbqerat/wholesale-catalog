import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSessionClient } from "../supabase/server";
import type { Locale } from "../i18n/config";

export type AdminUser = { id: string; email: string | null };

/**
 * Data access layer for admin authorization. The session JWT is verified by
 * Supabase (`getClaims`), and admin membership is checked in the database via
 * `public.is_admin()` — never from anything the browser can edit.
 */
export const getAdminContext = cache(async () => {
  const supabase = await createSessionClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");
  if (adminError || isAdmin !== true) return null;
  const user: AdminUser = {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
  return { supabase, user };
});

export async function requireAdmin(locale: Locale) {
  const context = await getAdminContext();
  if (!context) redirect(`/${locale}/admin/login`);
  return context;
}
