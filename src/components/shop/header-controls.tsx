"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Languages, ListChecks } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { LOCALE_COOKIE } from "@/lib/i18n/config";
import { useSelection } from "@/lib/selection/store";

export function SelectionLink() {
  const { locale, dict, t } = useI18n();
  const { items, hydrated } = useSelection();
  const count = items.length;
  return (
    <Link
      href={`/${locale}/selection`}
      className="relative inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-3.5 text-sm font-semibold text-white hover:bg-brand-hover"
    >
      <ListChecks aria-hidden className="size-5" />
      <span>{dict.nav.selection}</span>
      {hydrated && count > 0 && (
        <>
          <span
            aria-hidden
            className="num min-w-6 rounded-full bg-white px-1.5 text-center text-xs font-bold leading-6 text-brand"
          >
            {count}
          </span>
          <span className="sr-only">({t(dict.selection.itemsCount, { count })})</span>
        </>
      )}
    </Link>
  );
}

export function LanguageSwitcher() {
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const target = locale === "ar" ? "fr" : "ar";
  const rest = pathname.replace(/^\/(ar|fr)(?=\/|$)/, "");
  const query = searchParams.toString();
  const href = `/${target}${rest}${query ? `?${query}` : ""}`;

  return (
    <Link
      href={href}
      hrefLang={target}
      lang={target}
      aria-label={dict.nav.languageLabel}
      onClick={() => {
        document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`;
      }}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink hover:bg-ink/5"
    >
      <Languages aria-hidden className="size-4" />
      {dict.nav.language}
    </Link>
  );
}
