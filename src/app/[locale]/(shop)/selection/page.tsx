import { notFound } from "next/navigation";
import { SelectionView } from "@/components/shop/selection-view";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { whatsappNumberSetting } from "@/lib/site";
import { normalizeWhatsAppNumber } from "@/lib/whatsapp";

export default async function SelectionPage({ params }: PageProps<"/[locale]/selection">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <div className="space-y-5">
      <title>{dict.selection.title}</title>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold sm:text-3xl">{dict.selection.title}</h1>
      </div>
      <SelectionView whatsappNumber={normalizeWhatsAppNumber(whatsappNumberSetting())} />
    </div>
  );
}
