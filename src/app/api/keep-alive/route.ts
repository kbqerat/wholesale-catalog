import { createPublicClient } from "@/lib/supabase/server";

/**
 * Called daily by Vercel Cron (see vercel.json). Supabase pauses free-tier
 * projects after 7 days without activity; one tiny query keeps it awake.
 * When CRON_SECRET is set, Vercel sends it as a bearer token and only those
 * calls are accepted.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createPublicClient();
  if (!supabase) return Response.json({ ok: false, error: "Supabase not configured" }, { status: 500 });

  const { error } = await supabase.from("categories").select("id").limit(1);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 502 });
  return Response.json({ ok: true, at: new Date().toISOString() });
}
