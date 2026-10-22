"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Notice, buttonClass } from "@/components/ui";
import { confirmOrderAction, type FormState } from "@/lib/admin/actions";
import { MAX_QUANTITY } from "@/lib/selection/reducer";

export type ConfirmLine = {
  productId: string;
  name: string;
  quantity: number;
  stock: number;
};

const initialState: FormState = { status: "idle" };

/**
 * Seller-only panel on the order page: adjust quantities agreed with the
 * client, then confirm to deduct stock (once per order number).
 */
export function ConfirmOrderPanel({ orderRef, lines }: { orderRef: string; lines: ConfirmLine[] }) {
  const { locale, dict, t } = useI18n();
  const [state, formAction, pending] = useActionState(confirmOrderAction, initialState);
  const [quantities, setQuantities] = useState<Record<string, string>>(() =>
    Object.fromEntries(lines.map((l) => [l.productId, String(l.quantity)])),
  );

  const qty = (id: string) => {
    const n = Number(quantities[id]);
    return Number.isInteger(n) && n >= 0 ? Math.min(n, MAX_QUANTITY) : 0;
  };
  const items = lines.map((l) => ({ product_id: l.productId, quantity: qty(l.productId) })).filter((i) => i.quantity > 0);
  const units = items.reduce((n, i) => n + i.quantity, 0);

  if (state.status === "success") {
    return (
      <Notice tone="info" role="status" title={dict.admin.statusConfirmed}>
        <span className="inline-flex items-center gap-1.5">
          <CheckCircle2 aria-hidden className="size-4 text-brand" />
          {t(dict.admin.orderRef, { ref: orderRef })} —{" "}
          <Link href={`/${locale}/admin/orders`} className="font-semibold underline underline-offset-4">
            {dict.admin.viewOrders}
          </Link>
        </span>
      </Notice>
    );
  }

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (items.length === 0 || !window.confirm(t(dict.admin.confirmOrderConfirm, { ref: orderRef, units }))) {
          e.preventDefault();
        }
      }}
      className="space-y-4"
    >
      <input type="hidden" name="ref" value={orderRef} />
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <h2 className="flex items-center gap-2 text-base font-bold">
        <ShieldCheck aria-hidden className="size-5 text-brand" />
        {dict.admin.confirmTitle}
      </h2>

      {state.status === "error" && (
        <Notice tone="danger" role="alert">
          {dict.admin[state.message]}
        </Notice>
      )}

      <ul className="divide-y divide-line">
        {lines.map((l) => {
          const q = qty(l.productId);
          const short = q > l.stock;
          return (
            <li key={l.productId} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5">
              <span className="min-w-0 flex-1 text-sm font-semibold">{l.name}</span>
              <span className={`text-xs ${short ? "font-bold text-danger" : "text-muted"}`}>
                {short ? (
                  <span className="inline-flex items-center gap-1">
                    <AlertTriangle aria-hidden className="size-3.5" />
                    {t(dict.admin.notEnoughStock, { count: l.stock })}
                  </span>
                ) : (
                  t(dict.admin.currentStock, { count: l.stock })
                )}
              </span>
              <input
                inputMode="numeric"
                dir="ltr"
                aria-label={t(dict.admin.quantityToConfirm, { name: l.name })}
                value={quantities[l.productId]}
                onChange={(e) =>
                  setQuantities((s) => ({ ...s, [l.productId]: e.target.value.replace(/[^0-9]/g, "").slice(0, 5) }))
                }
                className={`num h-10 w-20 rounded-lg border bg-surface text-center text-[15px] font-semibold ${
                  short ? "border-danger text-danger" : "border-line-strong"
                }`}
              />
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-sm">
          {t(dict.selection.unitsCount, { count: units })}
        </span>
        <button type="submit" disabled={pending || items.length === 0} className={buttonClass("primary", "md")}>
          {pending ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <CheckCircle2 aria-hidden className="size-5" />}
          {pending ? dict.admin.confirming : dict.admin.confirmOrder}
        </button>
      </div>
      {items.length === 0 && <p className="text-sm text-danger">{dict.admin.nothingToConfirm}</p>}
    </form>
  );
}
