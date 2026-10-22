import Link from "next/link";
import { Suspense } from "react";
import { Languages } from "lucide-react";
import { LanguageSwitcher, SelectionLink } from "@/components/shop/header-controls";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { storeName } from "@/lib/site";
import { notFound } from "next/navigation";

export default async function ShopLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const name = storeName(dict);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:start-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
      >
        {dict.nav.skipToContent}
      </a>
      <header className="sticky top-0 z-30 border-b border-line bg-canvas/95 backdrop-blur supports-[backdrop-filter]:bg-canvas/85">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5">
          <Link href={`/${locale}`} className="me-auto min-w-0 rounded-lg py-1">
            <span className="block truncate text-lg font-bold leading-tight">{name}</span>
            <span className="block text-xs text-muted">{dict.nav.wholesaleTagline}</span>
          </Link>
          <Suspense fallback={<LanguagePlaceholder label={dict.nav.language} />}>
            <LanguageSwitcher />
          </Suspense>
          <SelectionLink />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-5">
        {children}
      </main>
      <Footer name={name} tagline={dict.nav.wholesaleTagline} />
    </div>
  );
}

function LanguagePlaceholder({ label }: { label: string }) {
  return (
    <span className="inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-semibold text-muted">
      <Languages aria-hidden className="size-4" />
      {label}
    </span>
  );
}

function Footer({ name, tagline }: { name: string; tagline: string }) {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted">
        {name} — {tagline}
      </div>
    </footer>
  );
}
