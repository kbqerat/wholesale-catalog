"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ListChecks, MessageCircle, Trash2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { ProductImage } from "@/components/product-image";
import { QuantityStepper } from "@/components/quantity-stepper";
import { EmptyState, Notice, buttonClass } from "@/components/ui";
import { getSelectionProducts } from "@/lib/catalog/actions";
import { pickLocalized } from "@/lib/i18n/config";
import { summarize, type SelectionItem } from "@/lib/selection/reducer";
import { dispatchSelection, markSelectionSent, useSelection } from "@/lib/selection/store";
import type { SentOrder } from "@/lib/selection/session";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { orderPath } from "@/lib/order-link";

export function SelectionView({ whatsappNumber }: { whatsappNumber: string | null }) {
  const { locale, dict, t } = useI18n();
  const { items, ref, lastSent, hydrated } = useSelection();
  const productIdsKey = useMemo(() => [...new Set(items.map((i) => i.productId))].sort().join(","), [items]);
  const [checkedKey, setCheckedKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  // Re-check names and availability against the live catalog whenever the
  // set of products in the list changes.
  useEffect(() => {
    if (!hydrated || !productIdsKey) return;
    let cancelled = false;
    getSelectionProducts(productIdsKey.split(","))
      .then((products) => {
        if (cancelled) return;
        dispatchSelection({ type: "reconcile", products });
        setCheckedKey(productIdsKey);
      })
      .catch(() => {
        if (!cancelled) setFailedKey(productIdsKey);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, productIdsKey]);

  const summary = summarize(items);
  // The WhatsApp link for exactly this list and its own order number. It is
  // final as rendered (nothing is changed at click time), so tapping, long
  // pressing or copying the link all send the same thing.
  const whatsappUrl = useMemo(() => {
    // Only used after hydration (see `hydrated` below), so `window` exists.
    if (!hydrated || !whatsappNumber || !ref || summary.sendable.length === 0) return null;
    const orderUrl = `${window.location.origin}${orderPath(locale, summary.sendable, ref)}`;
    return buildWhatsAppUrl(whatsappNumber, buildWhatsAppMessage({ orderUrl, orderRef: ref, dict }));
  }, [hydrated, whatsappNumber, ref, summary.sendable, locale, dict]);

  if (!hydrated) {
    return <div className="h-40 animate-pulse rounded-2xl bg-line/70" aria-busy="true" />;
  }

  if (items.length === 0 && lastSent) {
    return <SentConfirmation sent={lastSent} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ListChecks className="size-7" />}
        title={dict.selection.emptyTitle}
        body={dict.selection.emptyBody}
        action={
          <Link href={`/${locale}`} className={buttonClass("primary")}>
            {dict.selection.browse}
          </Link>
        }
      />
    );
  }

  const checking = checkedKey !== productIdsKey && failedKey !== productIdsKey;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <section className="space-y-3" aria-label={dict.selection.title}>
        {checking && (
          <p className="text-sm text-muted" role="status">
            {dict.selection.refreshing}
          </p>
        )}
        {failedKey === productIdsKey && <Notice tone="warn" role="status">{dict.selection.refreshFailed}</Notice>}
        <ul className="space-y-3">
          {items.map((item) => (
            <SelectionRow key={item.key} item={item} />
          ))}
        </ul>
        <button
          type="button"
          className={buttonClass("ghost", "sm", "text-danger")}
          onClick={() => {
            if (window.confirm(dict.selection.clearConfirm)) dispatchSelection({ type: "clear" });
          }}
        >
          <Trash2 aria-hidden className="size-4" />
          {dict.selection.clear}
        </button>
      </section>

      <aside className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5 lg:sticky lg:top-24">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{t(dict.selection.itemsCount, { count: summary.itemCount })}</dt>
            <dd className="num">{t(dict.selection.unitsCount, { count: summary.unitCount })}</dd>
          </div>
        </dl>
        <p className="text-xs leading-relaxed text-muted">{dict.selection.intro}</p>

        {!whatsappNumber ? (
          <Notice tone="warn" title={dict.selection.notConfiguredTitle} role="status">
            {dict.selection.notConfiguredBody}
          </Notice>
        ) : !whatsappUrl ? (
          <Notice tone="warn" role="status">
            {dict.selection.nothingToSend}
          </Notice>
        ) : (
          <div className="space-y-2">
            {ref && <p className="num text-center text-sm font-bold">{t(dict.admin.orderRef, { ref })}</p>}
            <a
              href={whatsappUrl}
              aria-disabled={checking}
              onClick={(e) => {
                // Wait for the availability check so unavailable products are left out.
                if (checking) {
                  e.preventDefault();
                  return;
                }
                // Saves the new empty list now; the page switches after the browser opens this link.
                markSelectionSent(whatsappUrl);
              }}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass("whatsapp", "lg", "w-full")}
            >
              <MessageCircle aria-hidden className="size-5" />
              {dict.selection.sendWhatsApp}
            </a>
            <p className="text-center text-xs text-muted">{dict.selection.whatsappHint}</p>
          </div>
        )}
      </aside>
    </div>
  );
}

/** Shown after sending: the list is now empty, ready for a new order. */
function SentConfirmation({ sent }: { sent: SentOrder }) {
  const { locale, dict, t } = useI18n();
  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-brand/30 bg-surface p-6 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand" aria-hidden>
        <CheckCircle2 className="size-7" />
      </div>
      <div className="space-y-1" role="status">
        <h2 className="text-lg font-bold">{dict.selection.sentTitle}</h2>
        <p className="num font-bold">{t(dict.admin.orderRef, { ref: sent.ref })}</p>
        <p className="text-sm text-muted">{t(dict.selection.sentBody, { count: sent.count })}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href={`/${locale}`} className={buttonClass("primary")}>
          {dict.selection.newOrder}
        </Link>
        <a href={sent.url} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary")}>
          <MessageCircle aria-hidden className="size-4" />
          {dict.selection.resend}
        </a>
      </div>
    </div>
  );
}

function SelectionRow({ item }: { item: SelectionItem }) {
  const { locale, dict, t } = useI18n();
  const name = pickLocalized(locale, item.name_ar, item.name_fr);
  const variant = pickLocalized(locale, item.variant_ar, item.variant_fr);
  const inactive = item.status !== "ok";

  return (
    <li
      className={`flex gap-3 rounded-2xl border bg-surface p-3 sm:gap-4 ${inactive ? "border-danger/30" : "border-line"}`}
    >
      <Link
        href={`/${locale}/products/${item.productId}`}
        className="w-20 shrink-0 self-start overflow-hidden rounded-xl sm:w-24"
        tabIndex={-1}
        aria-hidden
      >
        <ProductImage
          src={item.image}
          alt=""
          sizes="96px"
          noPhotoLabel=""
          className={inactive ? "opacity-50 grayscale" : ""}
        />
      </Link>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <Link
              href={`/${locale}/products/${item.productId}`}
              className="line-clamp-2 font-semibold leading-snug hover:underline"
            >
              {name}
            </Link>
            {variant && <p className="text-sm text-muted">{variant}</p>}
          </div>
          <button
            type="button"
            onClick={() => dispatchSelection({ type: "remove", key: item.key })}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger"
            aria-label={t(dict.selection.removeItem, { name })}
          >
            <Trash2 aria-hidden className="size-4.5" />
          </button>
        </div>

        {inactive ? (
          <p className="text-sm font-medium text-danger">
            {item.status === "removed" ? dict.selection.removedItem : dict.selection.unavailableItem}
          </p>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <QuantityStepper
              id={`qty-${item.key}`}
              size="sm"
              value={item.quantity}
              onChange={(quantity) => dispatchSelection({ type: "setQuantity", key: item.key, quantity })}
              label={t(dict.selection.quantityFor, { name })}
              decreaseLabel={dict.product.decrease}
              increaseLabel={dict.product.increase}
            />
          </div>
        )}
      </div>
    </li>
  );
}
