import { Suspense } from "react";
import { randomUUID } from "node:crypto";
import { notFound, redirect } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminCategories } from "@/lib/admin/queries";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";

// Admin data is read per request: stream it so navigating between admin pages is instant.
export default function NewProductPage(props: PageProps<"/[locale]/admin/products/new">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <NewProductContent {...props} />
    </Suspense>
  );
}

async function NewProductContent({ params }: PageProps<"/[locale]/admin/products/new">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireAdmin(locale);
  const [dict, categories] = await Promise.all([getDictionary(locale), getAdminCategories(supabase)]);
  if (categories.length === 0) redirect(`/${locale}/admin/categories`);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{dict.admin.newProduct}</h1>
      <ProductForm productId={randomUUID()} product={null} categories={categories} />
    </div>
  );
}
