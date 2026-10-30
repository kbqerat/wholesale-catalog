import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AddToSelection } from "@/components/shop/add-to-selection";
import { ProductCard } from "@/components/shop/product-card";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductSlider } from "@/components/shop/product-slider";
import { Badge, Notice } from "@/components/ui";
import { getCatalog } from "@/lib/catalog/queries";
import { formatPrice } from "@/lib/format";
import { interpolate, isLocale, pickLocalized, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default function ProductPage({ params }: PageProps<"/[locale]/products/[id]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductDetail params={params} />
    </Suspense>
  );
}

async function ProductDetail({ params }: Pick<PageProps<"/[locale]/products/[id]">, "params">) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const [dict, catalog] = await Promise.all([getDictionary(locale), getCatalog()]);
  const product = catalog.products.find((p) => p.id === id);
  if (!product) notFound();

  const category = catalog.categories.find((c) => c.id === product.category_id);
  const name = pickLocalized(locale, product.name_ar, product.name_fr);
  // Other available products, same category first (sort is stable, so the
  // catalog order is kept within each group).
  const others = catalog.products
    .filter((p) => p.id !== product.id && p.is_available)
    .sort((a, b) => Number(b.category_id === product.category_id) - Number(a.category_id === product.category_id))
    .slice(0, 12);

  return (
    <article className="space-y-5">
      <title>{name}</title>
      <BackLink locale={locale} label={dict.product.backToCatalog} />
      {catalog.isSample && <Notice tone="warn">{dict.common.sampleBanner}</Notice>}

      <div className="grid gap-6 md:grid-cols-2 md:gap-10">
        <ProductGallery images={product.images} name={name} dimmed={!product.is_available} />

        <div className="space-y-5">
          <div className="space-y-2">
            {category && (
              <p className="text-sm font-medium text-muted">{locale === "fr" ? category.name_fr : category.name_ar}</p>
            )}
            <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{name}</h1>
            {product.wholesale_price != null && (
              <p className="num text-xl font-bold text-brand">
                {interpolate(dict.product.unitPrice, { price: formatPrice(product.wholesale_price, locale) })}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span>
                {product.is_available ? (
                  <Badge tone="success">{dict.common.available}</Badge>
                ) : (
                  <Badge tone="danger">{dict.common.unavailable}</Badge>
                )}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <AddToSelection product={product} />
          </div>
        </div>
      </div>

      {others.length > 0 && (
        <section className="space-y-3 border-t border-line pt-6" aria-labelledby="other-products">
          <h2 id="other-products" className="text-lg font-bold">
            {dict.product.otherProducts}
          </h2>
          <ProductSlider
            label={dict.product.otherProducts}
            prevLabel={dict.product.scrollPrev}
            nextLabel={dict.product.scrollNext}
          >
            {others.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                locale={locale}
                dict={dict}
                className="w-40 shrink-0 snap-start sm:w-52"
              />
            ))}
          </ProductSlider>
        </section>
      )}
    </article>
  );
}

function BackLink({ locale, label }: { locale: Locale; label: string }) {
  const Icon = locale === "ar" ? ArrowRight : ArrowLeft;
  return (
    <Link
      href={`/${locale}`}
      className="inline-flex min-h-10 items-center gap-1.5 rounded-lg text-sm font-semibold text-muted hover:text-ink"
    >
      <Icon aria-hidden className="size-4" />
      {label}
    </Link>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid animate-pulse gap-6 md:grid-cols-2 md:gap-10" aria-busy="true">
      <div className="aspect-square rounded-2xl bg-line/70" />
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-line" />
        <div className="h-8 w-3/4 rounded-lg bg-line" />
        <div className="h-7 w-32 rounded-lg bg-line" />
        <div className="h-48 rounded-2xl bg-line/70" />
      </div>
    </div>
  );
}
