import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";
import { ExternalLink, LogOut } from "lucide-react";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
import { Notice, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { countLowStockProducts } from "@/lib/admin/queries";
import { signOutAction } from "@/lib/admin/actions";
import { interpolate, isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminPanelLayout({ children, params }: LayoutProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16">
        <Notice tone="warn" title={dict.admin.notConfiguredTitle}>
          {dict.admin.notConfiguredBody}
        </Notice>
        <Suspense>
          <RequestTimeMarker />
        </Suspense>
      </main>
    );
  }

  return (
    <div className="min-h-dvh">
      <title>{dict.admin.title}</title>
      {/* The session is read per request, so the protected UI streams in. */}
      <Suspense fallback={<AdminSkeleton />}>
        <AdminGate locale={locale} dict={dict}>
          {children}
        </AdminGate>
      </Suspense>
    </div>
  );
}

async function AdminGate({ locale, dict, children }: { locale: Locale; dict: Dictionary; children: ReactNode }) {
  const { user, supabase } = await requireAdmin(locale);
  const lowStockCount = await countLowStockProducts(supabase);
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
          <p className="me-auto font-bold">{dict.admin.title}</p>
          <Link href={`/${locale}`} className={buttonClass("ghost", "sm")}>
            <ExternalLink aria-hidden className="size-4" />
            {dict.admin.viewSite}
          </Link>
          <form action={signOutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className={buttonClass("secondary", "sm")}>
              <LogOut aria-hidden className="size-4" />
              {dict.admin.signOut}
            </button>
          </form>
        </div>
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4">
          <AdminNavLinks lowStockCount={lowStockCount} />
          {user.email && (
            <span className="ms-auto hidden truncate pb-2 text-xs text-muted sm:block" dir="auto">
              {interpolate(dict.admin.signedInAs, { email: user.email })}
            </span>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">{children}</main>
    </>
  );
}

/** Admin pages are always rendered per request, even in this setup state. */
async function RequestTimeMarker() {
  await connection();
  return null;
}

function AdminSkeleton() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-4 px-4 py-6" aria-busy="true">
      <div className="h-10 rounded-xl bg-line" />
      <div className="h-24 rounded-2xl bg-line/70" />
      <div className="h-24 rounded-2xl bg-line/70" />
    </div>
  );
}
