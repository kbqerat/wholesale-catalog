import { Suspense } from "react";
import { OrderSkeleton, OrderView, orderMetadata } from "@/components/shop/order-view";

/** Order link sent on WhatsApp: /{locale}/o/{orderRef}/{items}. */

type Props = PageProps<"/[locale]/o/[ref]/[items]">;

/** Params may still contain %-escapes; a malformed one must not crash the page. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({ params }: Props) {
  const { locale, items } = await params;
  return orderMetadata(locale, safeDecode(items));
}

export default function OrderPage({ params }: Props) {
  return (
    <Suspense fallback={<OrderSkeleton />}>
      {params.then(({ locale, ref, items }) => (
        <OrderView locale={locale} itemsRaw={safeDecode(items)} orderRef={safeDecode(ref).toUpperCase()} />
      ))}
    </Suspense>
  );
}
