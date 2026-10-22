"use client";

import { useActionState, useEffect, useId, useState, type ChangeEvent } from "react";
import { Check, FolderPlus, Loader2, Save } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { DeleteButton } from "./delete-button";
import { errorText } from "./admin-error-text";
import { Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { deleteCategoryAction, saveCategoryAction, type FormState } from "@/lib/admin/actions";
import type { CategoryWithCount } from "@/lib/admin/queries";

const initialState: FormState = { status: "idle" };

export function CategoryManager({ categories }: { categories: CategoryWithCount[] }) {
  const { dict, t } = useI18n();
  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {categories.map((c) => (
          <li key={c.id} className="rounded-2xl border border-line bg-surface p-4">
            <p className="mb-3 text-sm text-muted">{t(dict.admin.productsCount, { count: c.product_count })}</p>
            <CategoryForm category={c} />
          </li>
        ))}
      </ul>
      <section className="rounded-2xl border border-dashed border-line-strong bg-surface p-4">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
          <FolderPlus aria-hidden className="size-5" />
          {dict.admin.newCategory}
        </h2>
        <CategoryForm category={null} />
      </section>
    </div>
  );
}

const empty = { name_ar: "", name_fr: "" };

function CategoryForm({ category }: { category: CategoryWithCount | null }) {
  const { dict, t } = useI18n();
  const formId = useId();
  const [state, formAction, pending] = useActionState(saveCategoryAction, initialState);
  const [values, setValues] = useState(() =>
    category
      ? { name_ar: category.name_ar, name_fr: category.name_fr }
      : empty,
  );
  const [savedAt, setSavedAt] = useState<FormState | null>(null);

  // Clear the "new category" form after a successful create.
  useEffect(() => {
    if (state.status === "success" && !category) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset after the server confirmed
      setValues(empty);
    }
    if (state.status === "success") setSavedAt(state);
  }, [state, category]);

  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const id = (name: string) => `${formId}-${name}`;
  const field = (name: keyof typeof values) => ({
    id: id(name),
    name,
    value: values[name],
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      setValues((v) => ({ ...v, [name]: e.target.value }));
      setSavedAt(null);
    },
    "aria-invalid": !!errors[name],
    className: inputClass,
  });

  return (
    <div className="space-y-3">
      <form action={formAction} className="space-y-3">
        {category && <input type="hidden" name="id" value={category.id} />}
        {state.status === "error" && !state.fieldErrors && (
          <Notice tone="danger" role="alert">
            {dict.admin[state.message]}
          </Notice>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id={id("name_ar")} label={dict.admin.nameAr} error={errorText(dict, errors.name_ar)}>
            <input {...field("name_ar")} dir="rtl" lang="ar" maxLength={80} required />
          </Field>
          <Field id={id("name_fr")} label={dict.admin.categoryNameFr} error={errorText(dict, errors.name_fr)}>
            <input {...field("name_fr")} dir="ltr" lang="fr" maxLength={80} required />
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" disabled={pending} className={buttonClass("primary", "sm")}>
            {pending ? <Loader2 aria-hidden className="size-4 animate-spin" /> : <Save aria-hidden className="size-4" />}
            {pending ? dict.admin.saving : dict.admin.save}
          </button>
          <span aria-live="polite">
            {savedAt && (
              <span className="inline-flex items-center gap-1 text-sm font-medium text-brand">
                <Check aria-hidden className="size-4" />
                {dict.admin.saved}
              </span>
            )}
          </span>
        </div>
      </form>
      {category && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <DeleteButton
            id={category.id}
            action={deleteCategoryAction}
            confirmMessage={t(dict.admin.deleteCategoryConfirm, { name: category.name_ar })}
          />
        </div>
      )}
    </div>
  );
}
