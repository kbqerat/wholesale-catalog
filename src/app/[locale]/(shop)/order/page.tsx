import { Suspense } from "react";
import { OrderSkeleton, OrderView, orderMetadata } from "@/components/shop/order-view";
import { recoverLegacyRef } from "@/lib/order-link";

/**
 * Old order links (/{locale}/order?i=…&r=…), kept so lists already sent on
 * WhatsApp still open. New links use /{locale}/o/{ref}/{items}.
 */

type Props = PageProps<"/[locale]/order">;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? null;

export async function generateMetadata({ params, searchParams }: Props) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  return orderMetadata(locale, first(query.i));
}

export default function LegacyOrderPage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<OrderSkeleton />}>
      {Promise.all([params, searchParams]).then(([{ locale }, query]) => (
        <OrderView
          locale={locale}
          itemsRaw={first(query.i)}
          orderRef={recoverLegacyRef(first(query.r), first(query.i))}
        />
      ))}
    </Suspense>
  );
}
