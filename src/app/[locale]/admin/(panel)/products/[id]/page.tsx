import { Suspense } from "react";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminCategories, getAdminProduct } from "@/lib/admin/queries";
import { isLocale, pickLocalized } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";

// Admin data is read per request: stream it so navigating between admin pages is instant.
export default function EditProductPage(props: PageProps<"/[locale]/admin/products/[id]">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <EditProductContent {...props} />
    </Suspense>
  );
}

async function EditProductContent({ params }: PageProps<"/[locale]/admin/products/[id]">) {
  const { locale, id } = await params;
  if (!isLocale(locale) || !z.uuid().safeParse(id).success) notFound();
  const { supabase } = await requireAdmin(locale);
  const [dict, categories, product] = await Promise.all([
    getDictionary(locale),
    getAdminCategories(supabase),
    getAdminProduct(supabase, id),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">{dict.admin.editProduct}</p>
        <h1 className="text-2xl font-bold">{pickLocalized(locale, product.name_ar, product.name_fr)}</h1>
      </div>
      {/* Keyed on the last update so a page kept alive by navigation never
          shows values from before the latest save. */}
      <ProductForm key={product.updated_at} productId={product.id} product={product} categories={categories} />
    </div>
  );
}
