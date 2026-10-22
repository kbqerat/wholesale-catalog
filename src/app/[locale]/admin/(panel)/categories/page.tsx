import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CategoryManager } from "@/components/admin/category-manager";
import { requireAdmin } from "@/lib/admin/auth";
import { getAdminCategories } from "@/lib/admin/queries";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";

// Admin data is read per request: stream it so navigating between admin pages is instant.
export default function AdminCategoriesPage(props: PageProps<"/[locale]/admin/categories">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <AdminCategoriesContent {...props} />
    </Suspense>
  );
}

async function AdminCategoriesContent({ params }: PageProps<"/[locale]/admin/categories">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { supabase } = await requireAdmin(locale);
  const [dict, categories] = await Promise.all([getDictionary(locale), getAdminCategories(supabase)]);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">{dict.admin.categories}</h1>
      <CategoryManager categories={categories} />
    </div>
  );
}
