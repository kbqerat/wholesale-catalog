import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PackagePlus, Pencil } from "lucide-react";
import { DeleteButton } from "@/components/admin/delete-button";
import { ProductImage } from "@/components/product-image";
import { Badge, EmptyState, buttonClass } from "@/components/ui";
import { StockBadge } from "@/components/admin/stock-badge";
import { isLowStock } from "@/lib/stock";
import { deleteProductAction } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminCategories, getAdminProducts } from "@/lib/admin/queries";
import { interpolate, isLocale, pickLocalized } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";

// Admin data is read per request: stream it so navigating between admin pages is instant.
export default function AdminProductsPage(props: PageProps<"/[locale]/admin">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <AdminProductsContent {...props} />
    </Suspense>
  );
}

async function AdminProductsContent({ params }: PageProps<"/[locale]/admin">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireAdmin(locale);
  const [dict, products, categories] = await Promise.all([
    getDictionary(locale),
    getAdminProducts(supabase),
    getAdminCategories(supabase),
  ]);
  const categoryName = new Map(categories.map((c) => [c.id, locale === "fr" ? c.name_fr : c.name_ar]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{dict.admin.products}</h1>
        {categories.length > 0 && (
          <Link href={`/${locale}/admin/products/new`} className={buttonClass("primary")}>
            <PackagePlus aria-hidden className="size-5" />
            {dict.admin.newProduct}
          </Link>
        )}
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={<PackagePlus className="size-7" />}
          title={dict.admin.noCategories}
          action={
            <Link href={`/${locale}/admin/categories`} className={buttonClass("primary")}>
              {dict.admin.newCategory}
            </Link>
          }
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<PackagePlus className="size-7" />}
          title={dict.admin.noProducts}
          action={
            <Link href={`/${locale}/admin/products/new`} className={buttonClass("primary")}>
              {dict.admin.newProduct}
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {products.map((p) => {
            const name = pickLocalized(locale, p.name_ar, p.name_fr);
            return (
              <li
                key={p.id}
                className={`flex gap-3 rounded-2xl border bg-surface p-3 sm:items-center sm:gap-4 ${
                  isLowStock(p.stock_quantity) ? "border-danger/50 bg-danger-soft/40 ring-1 ring-danger/20" : "border-line"
                }`}
              >
                <div className="w-16 shrink-0 overflow-hidden rounded-xl sm:w-20">
                  <ProductImage src={p.images[0]} alt="" sizes="80px" noPhotoLabel="" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-semibold leading-snug">{name}</p>
                  <p className="text-sm text-muted">{categoryName.get(p.category_id)}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <StockBadge stock={p.stock_quantity} dict={dict} />
                    {p.is_available ? (
                      <Badge tone="success">{dict.common.available}</Badge>
                    ) : (
                      <Badge tone="danger">{dict.common.unavailable}</Badge>
                    )}
                    {p.is_published ? (
                      <Badge>{dict.admin.published}</Badge>
                    ) : (
                      <Badge tone="warn">{dict.admin.draft}</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1 sm:hidden">
                    <RowActions locale={locale} id={p.id} name={name} dict={dict} />
                  </div>
                </div>
                <div className="hidden shrink-0 flex-wrap justify-end gap-2 sm:flex">
                  <RowActions locale={locale} id={p.id} name={name} dict={dict} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function RowActions({
  locale,
  id,
  name,
  dict,
}: {
  locale: string;
  id: string;
  name: string;
  dict: Awaited<ReturnType<typeof getDictionary>>;
}) {
  return (
    <>
      <Link href={`/${locale}/admin/products/${id}`} className={buttonClass("secondary", "sm")}>
        <Pencil aria-hidden className="size-4" />
        {dict.admin.edit}
      </Link>
      <DeleteButton
        id={id}
        action={deleteProductAction}
        confirmMessage={interpolate(dict.admin.deleteProductConfirm, { name })}
      />
    </>
  );
}
