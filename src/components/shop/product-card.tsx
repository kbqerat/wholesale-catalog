import Link from "next/link";
import { Badge } from "@/components/ui";
import { ProductImage } from "@/components/product-image";
import { formatPrice } from "@/lib/format";
import { interpolate, pickLocalized, type Locale } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";
import type { Product } from "@/lib/catalog/types";

export function ProductCard({
  product,
  locale,
  dict,
  priority = false,
  className = "",
}: {
  product: Product;
  locale: Locale;
  dict: Dictionary;
  priority?: boolean;
  className?: string;
}) {
  const name = pickLocalized(locale, product.name_ar, product.name_fr);
  const swatches = product.variants.filter((v) => v.color_hex).slice(0, 5);

  return (
    <li className={`group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_rgba(28,25,23,0.04)] transition-shadow hover:shadow-md ${className}`}>
      <div className="relative">
        <ProductImage
          src={product.images[0]}
          alt={interpolate(dict.product.photoOf, { name })}
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          priority={priority}
          noPhotoLabel={dict.product.noPhoto}
          className={product.is_available ? "" : "opacity-60 grayscale"}
        />
        {!product.is_available && (
          <span className="absolute start-2 top-2">
            <Badge tone="danger">{dict.common.unavailable}</Badge>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3 sm:p-4">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug">
          {/* The stretched link makes the whole card clickable. */}
          <Link
            href={`/${locale}/products/${product.id}`}
            className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-3 focus-visible:after:outline-focus"
          >
            {name}
          </Link>
        </h3>
        {product.wholesale_price != null && (
          <p className="num self-start rounded-full bg-price px-2.5 py-0.5 text-sm font-bold text-white">
            {interpolate(dict.product.unitPrice, { price: formatPrice(product.wholesale_price, locale) })}
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1 text-xs text-muted">
          {product.variants.length > 0 && (
            <span className="inline-flex items-center gap-1">
              {swatches.map((v) => (
                <span
                  key={v.id}
                  aria-hidden
                  className="size-3.5 rounded-full border border-ink/20"
                  style={{ backgroundColor: v.color_hex ?? undefined }}
                />
              ))}
              <span>{interpolate(dict.catalog.variantsCount, { count: product.variants.length })}</span>
            </span>
          )}
        </div>
      </div>
    </li>
  );
}
