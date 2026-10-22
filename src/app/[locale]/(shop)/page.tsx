import { notFound } from "next/navigation";
import { CatalogBrowser } from "@/components/shop/catalog-browser";
import { Notice } from "@/components/ui";
import { getCatalog } from "@/lib/catalog/queries";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";

export default async function CatalogPage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const [dict, catalog] = await Promise.all([getDictionary(locale), getCatalog()]);

  return (
    <div className="space-y-5">
      {catalog.isSample && <Notice tone="warn">{dict.common.sampleBanner}</Notice>}
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold sm:text-3xl">{dict.catalog.title}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted sm:text-[15px]">{dict.catalog.intro}</p>
      </div>
      <CatalogBrowser products={catalog.products} categories={catalog.categories} />
    </div>
  );
}
