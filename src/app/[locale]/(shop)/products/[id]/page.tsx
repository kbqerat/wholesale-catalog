import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AddToSelection } from "@/components/shop/add-to-selection";
import { ProductGallery } from "@/components/shop/product-gallery";
import { Badge, Notice } from "@/components/ui";
import { getCatalog } from "@/lib/catalog/queries";
import { isLocale, pickLocalized, type Locale } from "@/lib/i18n/config";
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
  const description = pickLocalized(locale, product.description_ar, product.description_fr);

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
            <p className="text-sm text-muted">{dict.product.priceOnWhatsApp}</p>
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

          {description && (
            <section className="space-y-2">
              <h2 className="text-base font-semibold">{dict.product.description}</h2>
              <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink/85">{description}</p>
            </section>
          )}
        </div>
      </div>
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
