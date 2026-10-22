import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackageCheck, Pencil } from "lucide-react";
import { StockBadge } from "@/components/admin/stock-badge";
import { StockUpdateForm } from "@/components/admin/stock-update-form";
import { ProductImage } from "@/components/product-image";
import { EmptyState, buttonClass } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getLowStockProducts } from "@/lib/admin/queries";
import { interpolate, isLocale, pickLocalized } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { LOW_STOCK_THRESHOLD } from "@/lib/stock";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";

// Admin data is read per request: stream it so navigating between admin pages is instant.
export default function LowStockPage(props: PageProps<"/[locale]/admin/low-stock">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <LowStockContent {...props} />
    </Suspense>
  );
}

async function LowStockContent({ params }: PageProps<"/[locale]/admin/low-stock">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireAdmin(locale);
  const [dict, products] = await Promise.all([getDictionary(locale), getLowStockProducts(supabase)]);

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold">{dict.admin.lowStockTitle}</h1>
        <p className="text-sm text-muted">{interpolate(dict.admin.lowStockIntro, { threshold: LOW_STOCK_THRESHOLD })}</p>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={<PackageCheck className="size-7" />}
          title={interpolate(dict.admin.noLowStock, { threshold: LOW_STOCK_THRESHOLD })}
        />
      ) : (
        <ul className="space-y-3">
          {products.map((p) => {
            const name = pickLocalized(locale, p.name_ar, p.name_fr);
            return (
              <li
                key={p.id}
                className="flex gap-3 rounded-2xl border border-danger/50 bg-danger-soft/40 p-3 ring-1 ring-danger/20 sm:items-center sm:gap-4"
              >
                <div className="w-16 shrink-0 overflow-hidden rounded-xl sm:w-20">
                  <ProductImage src={p.images[0]} alt="" sizes="80px" noPhotoLabel="" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold leading-snug">{name}</p>
                    <StockBadge stock={p.stock_quantity} dict={dict} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StockUpdateForm id={p.id} name={name} stock={p.stock_quantity} />
                    <Link href={`/${locale}/admin/products/${p.id}`} className={buttonClass("ghost", "sm")}>
                      <Pencil aria-hidden className="size-4" />
                      {dict.admin.edit}
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
