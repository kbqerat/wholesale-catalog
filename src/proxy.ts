import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { LOCALE_COOKIE, defaultLocale, isLocale } from "@/lib/i18n/config";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * 1. Paths without a locale prefix redirect to /ar (default) or the locale the
 *    visitor last picked.
 * 2. Admin routes refresh the Supabase session cookie and bounce signed-out
 *    visitors to the login page. This is only a convenience: every admin page
 *    and server action re-checks admin rights, and RLS enforces them again in
 *    the database.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const [, first, second, third] = pathname.split("/");

  if (!isLocale(first)) {
    const preferred = request.cookies.get(LOCALE_COOKIE)?.value;
    const locale = isLocale(preferred) ? preferred : defaultLocale;
    const url = request.nextUrl.clone();
    url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
    return NextResponse.redirect(url);
  }

  // A malformed %-escape (e.g. a truncated copy-paste) makes Next.js fail with
  // a 500 on dynamic routes. Send order links to the "invalid link" page and
  // anything else to the catalog instead.
  try {
    decodeURIComponent(pathname);
  } catch {
    const url = request.nextUrl.clone();
    url.pathname = second === "o" || second === "order" ? `/${first}/order` : `/${first}`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Admin pages, plus order pages opened by a signed-in seller (to confirm
  // orders). Visitors without a Supabase session cookie skip this entirely.
  const isAdminPath = second === "admin";
  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  const isOrderPath = second === "o" || second === "order";
  if (!isAdminPath && !(isOrderPath && hasSession)) return NextResponse.next();

  const env = getSupabaseEnv();
  if (!env) return NextResponse.next(); // Pages show setup instructions.

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isLoginPage = third === "login";
  if (isAdminPath && !data?.claims && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = `/${first}/admin/login`;
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals and static files. Static files are
    // matched by known extensions only: order links end in ".3" (a quantity)
    // and must still go through the proxy to keep the seller's session fresh.
    "/((?!_next/|api/|.*\\.(?:ico|png|jpe?g|gif|svg|webp|avif|txt|xml|json|webmanifest|js|css|map|woff2?)$).*)",
  ],
};
