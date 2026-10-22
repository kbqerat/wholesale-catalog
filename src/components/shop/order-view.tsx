import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LinkIcon } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { Badge, EmptyState, Notice } from "@/components/ui";
import { ConfirmOrderPanel, type ConfirmLine } from "@/components/admin/confirm-order-panel";
import { getAdminContext } from "@/lib/admin/auth";
import { getAdminProductsByIds, getOrderByRef } from "@/lib/admin/queries";
import { getCatalog } from "@/lib/catalog/queries";
import { formatDateTime } from "@/lib/format";
import { interpolate, isLocale, pickLocalized, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary";
import { decodeOrder, isOrderRef } from "@/lib/order-link";
import type { Catalog, Product } from "@/lib/catalog/types";

/**
 * Order details linked from the WhatsApp message: shows the seller the
 * photo and quantity of every product the client selected. Built from
 * the URL + the live catalog; nothing is stored.
 */

type Line = {
  key: string;
  quantity: number;
  product: Product | null;
  variantLabel: string | null;
  available: boolean;
};

function resolve(catalog: Catalog, itemsRaw: string | null, locale: Locale): Line[] {
  const byId = new Map(catalog.products.map((p) => [p.id, p]));
  return decodeOrder(itemsRaw).map((line) => {
    const product = byId.get(line.productId) ?? null;
    const variant = line.variantId ? product?.variants.find((v) => v.id === line.variantId) : null;
    const exists = product !== null && (line.variantId === null || !!variant);
    return {
      key: `${line.productId}:${line.variantId ?? "-"}`,
      quantity: line.quantity,
      product: exists ? product : null,
      variantLabel: variant ? pickLocalized(locale, variant.label_ar, variant.label_fr) : null,
      available: exists && product!.is_available && (variant ? variant.is_available : true),
    };
  });
}

export async function orderMetadata(locale: string, itemsRaw: string | null): Promise<Metadata> {
  if (!isLocale(locale)) return {};
  const [dict, catalog] = await Promise.all([getDictionary(locale), getCatalog()]);
  const lines = resolve(catalog, itemsRaw, locale).filter((l) => l.product);
  const title = interpolate(dict.order.shareTitle, {
    items: lines.length,
    units: lines.reduce((n, l) => n + l.quantity, 0),
  });
  const image = lines.find((l) => l.product!.images[0])?.product!.images[0];
  return {
    title,
    robots: { index: false, follow: false },
    // WhatsApp shows this title and the first product photo as a link preview.
    openGraph: { title, description: dict.order.intro, images: image ? [{ url: image }] : [] },
  };
}

export function OrderSkeleton() {
  return <div className="h-64 animate-pulse rounded-2xl bg-line/70" aria-busy="true" />;
}

/** Renders the order; wrap in <Suspense> (it reads request data). */
export async function OrderView({
  locale,
  itemsRaw,
  orderRef,
}: {
  locale: string;
  itemsRaw: string | null;
  orderRef: string | null;
}) {
  if (!isLocale(locale)) notFound();
  const [dict, catalog] = await Promise.all([getDictionary(locale), getCatalog()]);
  const lines = resolve(catalog, itemsRaw, locale);
  const ref = isOrderRef(orderRef) ? orderRef : null;

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={<LinkIcon className="size-7" />}
        title={dict.order.invalidTitle}
        body={dict.order.invalidBody}
      />
    );
  }

  const counted = lines.filter((l) => l.product && l.available);
  const units = counted.reduce((n, l) => n + l.quantity, 0);

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold sm:text-3xl">{dict.order.title}</h1>
        {ref && (
          <p className="num inline-block rounded-lg bg-ink/5 px-2.5 py-1 text-sm font-bold tracking-wide">
            {interpolate(dict.admin.orderRef, { ref })}
          </p>
        )}
        <p className="max-w-2xl text-sm leading-relaxed text-muted">{dict.order.intro}</p>
      </div>

      {/* Seller only: confirm the order and deduct stock. Renders nothing for clients. */}
      <Suspense fallback={null}>
        <SellerConfirmSection locale={locale} dict={dict} orderRef={ref} lines={lines} />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
        <ol className="space-y-3">
          {lines.map((line, index) => (
            <OrderRow key={line.key} line={line} index={index} locale={locale} dict={dict} />
          ))}
        </ol>

        <aside className="space-y-3 rounded-2xl border border-line bg-surface p-4 sm:p-5 lg:sticky lg:top-24">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{interpolate(dict.selection.itemsCount, { count: counted.length })}</dt>
              <dd className="num">{interpolate(dict.selection.unitsCount, { count: units })}</dd>
            </div>
          </dl>
        </aside>
      </div>
    </div>
  );
}

async function SellerConfirmSection({
  locale,
  dict,
  orderRef,
  lines,
}: {
  locale: Locale;
  dict: Dictionary;
  orderRef: string | null;
  lines: Line[];
}) {
  const admin = await getAdminContext();
  if (!admin) return null;

  const box = "rounded-2xl border-2 border-brand/30 bg-brand-soft/40 p-4 sm:p-5";
  if (!orderRef) {
    return (
      <div className={box}>
        <Notice tone="warn">{dict.admin.noRef}</Notice>
      </div>
    );
  }

  const existing = await getOrderByRef(admin.supabase, orderRef);
  if (existing) {
    const date = formatDateTime(existing.cancelled_at ?? existing.confirmed_at, locale);
    return (
      <div className={box}>
        <Notice tone={existing.status === "cancelled" ? "warn" : "info"} role="status">
          {interpolate(existing.status === "cancelled" ? dict.admin.alreadyCancelled : dict.admin.alreadyConfirmed, {
            date,
          })}{" "}
          <Link href={`/${locale}/admin/orders`} className="font-semibold underline underline-offset-4">
            {dict.admin.viewOrders}
          </Link>
        </Notice>
      </div>
    );
  }

  // Live stock levels (the public catalog never exposes them).
  const products = await getAdminProductsByIds(
    admin.supabase,
    lines.flatMap((l) => (l.product ? [l.product.id] : [])),
  );
  const byId = new Map(products.map((p) => [p.id, p]));
  const confirmLines: ConfirmLine[] = lines.flatMap((l) => {
    const p = l.product ? byId.get(l.product.id) : undefined;
    return p
      ? [
          {
            productId: p.id,
            name: pickLocalized(locale, p.name_ar, p.name_fr),
            quantity: l.quantity,
            stock: p.stock_quantity,
          },
        ]
      : [];
  });
  if (confirmLines.length === 0) return null;

  return (
    <div className={box}>
      <ConfirmOrderPanel orderRef={orderRef} lines={confirmLines} />
    </div>
  );
}

function OrderRow({ line, index, locale, dict }: { line: Line; index: number; locale: Locale; dict: Dictionary }) {
  const { product } = line;
  if (!product) {
    return (
      <li className="rounded-2xl border border-danger/30 bg-surface p-4 text-sm font-medium text-danger">
        {index + 1}. {dict.order.removed}
      </li>
    );
  }
  const name = pickLocalized(locale, product.name_ar, product.name_fr);
  return (
    <li className={`flex gap-3 rounded-2xl border bg-surface p-3 sm:gap-4 ${line.available ? "border-line" : "border-danger/30"}`}>
      <Link href={`/${locale}/products/${product.id}`} className="w-28 shrink-0 self-start overflow-hidden rounded-xl sm:w-36">
        <ProductImage
          src={product.images[0]}
          alt={interpolate(dict.product.photoOf, { name })}
          sizes="144px"
          noPhotoLabel={dict.product.noPhoto}
          className={line.available ? "" : "opacity-50 grayscale"}
        />
      </Link>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-semibold leading-snug">
          <span className="num text-muted">{index + 1}. </span>
          <Link href={`/${locale}/products/${product.id}`} className="hover:underline">
            {name}
          </Link>
        </p>
        {line.variantLabel && <p className="text-sm text-muted">{line.variantLabel}</p>}
        {!line.available && <Badge tone="danger">{dict.common.unavailable}</Badge>}
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
          <dt className="text-muted">{dict.product.quantity}</dt>
          <dd className="num font-semibold">{line.quantity}</dd>
        </dl>
      </div>
    </li>
  );
}
