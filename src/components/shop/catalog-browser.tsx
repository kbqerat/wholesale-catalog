"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { PackageOpen, Search, SearchX, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { EmptyState, buttonClass } from "@/components/ui";
import { ProductCard } from "./product-card";
import { filterProducts } from "@/lib/search";
import type { Category, Product } from "@/lib/catalog/types";

/**
 * Client-side search and category filter. The full published catalog is
 * small enough to ship once, which makes filtering instant on mobile.
 * Filters are mirrored to the URL (?q=&c=) so a filtered view can be shared.
 */
export function CatalogBrowser({ products, categories }: { products: Product[]; categories: Category[] }) {
  const { locale, dict, t } = useI18n();
  const [query, setQuery] = useState("");
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query);

  // Read initial filters from the URL once on mount (keeps the page static).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const c = params.get("c");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL
    if (q) setQuery(q.slice(0, 100));
    if (c && categories.some((cat) => cat.slug === c)) setCategorySlug(c);
  }, [categories]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (deferredQuery.trim()) url.searchParams.set("q", deferredQuery.trim());
    else url.searchParams.delete("q");
    if (categorySlug) url.searchParams.set("c", categorySlug);
    else url.searchParams.delete("c");
    window.history.replaceState(window.history.state, "", url);
  }, [deferredQuery, categorySlug]);

  const visible = useMemo(
    () => filterProducts(products, categories, { query: deferredQuery, categorySlug }),
    [products, categories, deferredQuery, categorySlug],
  );

  const clearFilters = () => {
    setQuery("");
    setCategorySlug(null);
  };

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen className="size-7" />}
        title={dict.catalog.noProductsTitle}
        body={dict.catalog.noProductsBody}
      />
    );
  }

  const chip = (active: boolean) =>
    `shrink-0 min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors ${
      active
        ? "border-ink bg-ink text-white"
        : "border-line-strong bg-surface text-ink hover:border-ink/50"
    }`;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <label htmlFor="catalog-search" className="sr-only">
            {dict.catalog.searchLabel}
          </label>
          <Search aria-hidden className="pointer-events-none absolute start-3.5 top-1/2 size-5 -translate-y-1/2 text-muted" />
          <input
            id="catalog-search"
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            maxLength={100}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={dict.catalog.searchPlaceholder}
            className="block min-h-12 w-full rounded-2xl border border-line-strong bg-surface pe-11 ps-11 text-base placeholder:text-muted/80"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute end-1.5 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-ink/5"
              aria-label={dict.common.close}
            >
              <X aria-hidden className="size-4" />
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div
            role="group"
            aria-label={dict.catalog.filterLabel}
            className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
          >
            <button type="button" className={chip(categorySlug === null)} aria-pressed={categorySlug === null} onClick={() => setCategorySlug(null)}>
              {dict.catalog.allCategories}
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={chip(categorySlug === c.slug)}
                aria-pressed={categorySlug === c.slug}
                onClick={() => setCategorySlug(c.slug)}
              >
                {locale === "fr" ? c.name_fr : c.name_ar}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        {t(dict.catalog.resultsCount, { count: visible.length })}
      </p>

      {visible.length === 0 ? (
        <EmptyState
          icon={<SearchX className="size-7" />}
          title={dict.catalog.emptyTitle}
          body={dict.catalog.emptyBody}
          action={
            <button type="button" className={buttonClass("secondary")} onClick={clearFilters}>
              {dict.catalog.clearFilters}
            </button>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {visible.map((product, index) => (
            <ProductCard key={product.id} product={product} locale={locale} dict={dict} priority={index < 4} />
          ))}
        </ul>
      )}
    </div>
  );
}
