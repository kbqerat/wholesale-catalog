"use client";

import { useActionState, useId } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { buttonClass, inputClass } from "@/components/ui";
import { errorText } from "./admin-error-text";
import { updateStockAction, type FormState } from "@/lib/admin/actions";

const initialState: FormState = { status: "idle" };

/** Inline "new quantity + update" form used on the low-stock page. */
export function StockUpdateForm({ id, name, stock }: { id: string; name: string; stock: number }) {
  const { dict, t } = useI18n();
  const inputId = useId();
  const [state, formAction, pending] = useActionState(updateStockAction, initialState);
  const fieldError = state.status === "error" ? state.fieldErrors?.[""] ?? state.fieldErrors?._form : undefined;
  const message =
    state.status === "error" ? (fieldError ? errorText(dict, fieldError) : dict.admin[state.message]) : null;

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <label htmlFor={inputId} className="sr-only">
        {t(dict.admin.newStock, { name })}
      </label>
      <input
        id={inputId}
        // Re-mount with the saved value after a successful update.
        key={stock}
        name="stock_quantity"
        defaultValue={stock}
        inputMode="numeric"
        dir="ltr"
        required
        aria-invalid={!!message}
        className={`${inputClass} num w-24 text-center`}
      />
      <button type="submit" disabled={pending} className={buttonClass("primary", "sm")}>
        {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <RefreshCw aria-hidden className="size-4" />}
        {dict.admin.updateStock}
      </button>
      {message && (
        <p role="alert" className="basis-full text-sm font-medium text-danger">
          {message}
        </p>
      )}
    </form>
  );
}
