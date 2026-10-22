export const PRODUCT_IMAGES_BUCKET = "product-images";

export type SupabaseEnv = { url: string; anonKey: string };

/**
 * Public Supabase settings. The anon key is designed to be public: all
 * protection comes from the row level security policies in the migrations.
 * Returns `null` when not configured so the app can show setup guidance.
 */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey || !/^https?:\/\//.test(url)) return null;
  return { url: url.replace(/\/+$/, ""), anonKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseEnv() !== null;
}

export function publicImageUrl(env: SupabaseEnv, path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${env.url}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${encoded}`;
}
