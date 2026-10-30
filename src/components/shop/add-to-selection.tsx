"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Check, CircleSlash, Plus } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { QuantityInput } from "@/components/quantity-input";
import { Notice, buttonClass } from "@/components/ui";
import { pickLocalized } from "@/lib/i18n/config";
import { snapshotFromProduct } from "@/lib/selection/reducer";
import { dispatchSelection } from "@/lib/selection/store";
import type { Product } from "@/lib/catalog/types";

export function AddToSelection({ product }: { product: Product }) {
  const { locale, dict } = useI18n();
  const id = useId();
  const availableVariants = product.variants.filter((v) => v.is_available);
  const [variantId, setVariantId] = useState<string | null>(
    availableVariants.length === 1 ? availableVariants[0].id : null,
  );
  const [quantity, setQuantity] = useState<number | null>(null);
  const [status, setStatus] = useState<"idle" | "added" | "needsVariant" | "needsQuantity">("idle");

  if (!product.is_available) {
    return (
      <Notice tone="danger" role="status">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <CircleSlash aria-hidden className="size-4" />
          {dict.product.unavailableNotice}
        </span>
      </Notice>
    );
  }

  const hasVariants = product.variants.length > 0;

  function add() {
    if (hasVariants && !variantId) {
      setStatus("needsVariant");
      return;
    }
    if (quantity === null) {
      setStatus("needsQuantity");
      return;
    }
    dispatchSelection({ type: "add", item: snapshotFromProduct(product, variantId), quantity });
    setStatus("added");
  }

  return (
    <div className="space-y-5">
      {hasVariants && (
        <fieldset aria-describedby={status === "needsVariant" ? `${id}-variant-error` : undefined}>
          <legend className="mb-2 text-sm font-semibold">{dict.product.chooseVariant}</legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => {
              const label = pickLocalized(locale, v.label_ar, v.label_fr);
              const selected = v.id === variantId;
              return (
                <label
                  key={v.id}
                  className={`relative inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-focus ${
                    !v.is_available
                      ? "cursor-not-allowed border-dashed border-line-strong text-muted line-through"
                      : selected
                        ? "cursor-pointer border-ink bg-ink text-white"
                        : "cursor-pointer border-line-strong bg-surface hover:border-ink/60"
                  }`}
                >
                  <input
                    type="radio"
                    name={`${id}-variant`}
                    value={v.id}
                    checked={selected}
                    disabled={!v.is_available}
                    onChange={() => {
                      setVariantId(v.id);
                      setStatus("idle");
                    }}
                    className="sr-only"
                  />
                  {v.color_hex && (
                    <span
                      aria-hidden
                      className={`size-4 rounded-full border ${selected ? "border-white/70" : "border-ink/25"}`}
                      style={{ backgroundColor: v.color_hex }}
                    />
                  )}
                  <span>{label}</span>
                  {!v.is_available && <span className="sr-only">({dict.product.variantUnavailable})</span>}
                </label>
              );
            })}
          </div>
          {status === "needsVariant" && (
            <p id={`${id}-variant-error`} role="alert" className="mt-2 text-sm font-medium text-danger">
              {dict.product.variantRequired}
            </p>
          )}
        </fieldset>
      )}

      <div className="space-y-2">
        <label htmlFor={`${id}-qty`} className="block text-sm font-semibold">
          {dict.product.chooseQuantity}
        </label>
        <QuantityInput
          id={`${id}-qty`}
          value={quantity}
          onChange={(q) => {
            setQuantity(q);
            setStatus("idle");
          }}
          label={dict.product.chooseQuantity}
          invalid={status === "needsQuantity"}
          describedBy={status === "needsQuantity" ? `${id}-qty-error` : undefined}
        />
        {status === "needsQuantity" && (
          <p id={`${id}-qty-error`} role="alert" className="text-sm font-medium text-danger">
            {dict.product.quantityRequired}
          </p>
        )}
      </div>

      <button type="button" onClick={add} className={buttonClass("primary", "lg", "w-full sm:w-auto")}>
        <Plus aria-hidden className="size-5" />
        {dict.product.addToSelection}
      </button>

      <div aria-live="polite">
        {status === "added" && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-brand/25 bg-brand-soft p-3 text-sm text-brand">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Check aria-hidden className="size-4" />
              {dict.product.added}
            </span>
            <Link href={`/${locale}/selection`} className="font-semibold underline underline-offset-4">
              {dict.product.viewSelection}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
