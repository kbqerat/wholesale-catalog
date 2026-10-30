"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useId, useRef, useState, type ReactNode } from "react";
import { ImagePlus, Loader2, Save, Star, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Field, Notice, buttonClass, inputClass } from "@/components/ui";
import { errorText } from "./admin-error-text";
import { saveProductAction, type FormState } from "@/lib/admin/actions";
import { ACCEPTED_IMAGE_TYPES, prepareImage } from "@/lib/admin/image-resize";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { PRODUCT_IMAGES_BUCKET, getSupabaseEnv, publicImageUrl } from "@/lib/supabase/env";
import { MAX_IMAGES, productSchema, toFieldErrors, type FieldErrors } from "@/lib/validation/admin";
import type { AdminProduct, Category } from "@/lib/catalog/types";
import { isLowStock } from "@/lib/stock";

type Draft = {
  category_id: string;
  name_ar: string;
  wholesale_price: string;
  stock_quantity: string;
  is_available: boolean;
  is_published: boolean;
};

const initialState: FormState = { status: "idle" };

function draftFrom(product: AdminProduct | null, categories: Category[]): Draft {
  return {
    category_id: product?.category_id ?? (categories.length === 1 ? categories[0].id : ""),
    name_ar: product?.name_ar ?? "",
    wholesale_price: product?.wholesale_price != null ? String(product.wholesale_price) : "",
    stock_quantity: product ? String(product.stock_quantity) : "",
    is_available: product?.is_available ?? true,
    is_published: product?.is_published ?? true,
  };
}

export function ProductForm({
  productId,
  product,
  categories,
}: {
  /** Pre-generated for new products so images can be uploaded before saving. */
  productId: string;
  product: AdminProduct | null;
  categories: Category[];
}) {
  const { locale, dict } = useI18n();
  const formId = useId();
  const [state, formAction, pending] = useActionState(saveProductAction, initialState);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(product, categories));
  const [images, setImages] = useState<string[]>(product?.image_paths ?? []);
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);

  const payload = {
    id: productId,
    ...draft,
    // One name, in any language. The French name and descriptions are left
    // out, so saving clears them.
    images,
  };

  // Client errors (from the last submit attempt) take precedence; otherwise
  // show what the server returned.
  const errors: FieldErrors =
    clientErrors ?? (state.status === "error" ? (state.fieldErrors ?? {}) : {});
  const err = (path: string) => errorText(dict, errors[path]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const ids = (name: string) => `${formId}-${name}`;
  const describedBy = (name: string) => (errors[name] ? `${ids(name)}-error` : undefined);

  return (
    <form
      action={formAction}
      noValidate
      onSubmit={(e) => {
        const result = productSchema.safeParse(payload);
        if (!result.success) {
          e.preventDefault();
          setClientErrors(toFieldErrors(result.error));
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        setClientErrors(null);
      }}
      className="space-y-6"
    >
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      {(clientErrors || state.status === "error") && (
        <Notice tone="danger" role="alert">
          {clientErrors ? dict.admin.formHasErrors : state.status === "error" ? dict.admin[state.message] : null}
        </Notice>
      )}

      <Section>
        <Field id={ids("category_id")} label={dict.admin.category} error={err("category_id")}>
          <select
            id={ids("category_id")}
            value={draft.category_id}
            onChange={(e) => set("category_id", e.target.value)}
            aria-invalid={!!errors.category_id}
            aria-describedby={describedBy("category_id")}
            className={inputClass}
          >
            <option value="">{dict.admin.chooseCategory}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {locale === "fr" ? c.name_fr : c.name_ar}
              </option>
            ))}
          </select>
        </Field>

        <Field id={ids("name_ar")} label={dict.admin.productName} error={err("name_ar")}>
          <input
            id={ids("name_ar")}
            dir="auto"
            value={draft.name_ar}
            maxLength={120}
            onChange={(e) => set("name_ar", e.target.value)}
            aria-invalid={!!errors.name_ar}
            aria-describedby={describedBy("name_ar")}
            className={inputClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={ids("wholesale_price")} label={dict.admin.price} hint={dict.admin.priceHint} error={err("wholesale_price")}>
            <input
              id={ids("wholesale_price")}
              inputMode="decimal"
              dir="ltr"
              value={draft.wholesale_price}
              onChange={(e) => set("wholesale_price", e.target.value)}
              aria-invalid={!!errors.wholesale_price}
              aria-describedby={describedBy("wholesale_price") ?? `${ids("wholesale_price")}-hint`}
              className={inputClass}
            />
          </Field>
          <Field id={ids("stock_quantity")} label={dict.admin.stock} hint={dict.admin.stockHint} error={err("stock_quantity")}>
            <input
              id={ids("stock_quantity")}
              inputMode="numeric"
              dir="ltr"
              value={draft.stock_quantity}
              onChange={(e) => set("stock_quantity", e.target.value)}
              aria-invalid={!!errors.stock_quantity}
              aria-describedby={describedBy("stock_quantity") ?? `${ids("stock_quantity")}-hint`}
              className={`${inputClass} ${
                /^\d+$/.test(draft.stock_quantity.trim()) && isLowStock(Number(draft.stock_quantity))
                  ? "border-danger bg-danger-soft font-semibold text-danger"
                  : ""
              }`}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            checked={draft.is_available}
            onChange={(v) => set("is_available", v)}
            label={dict.admin.isAvailable}
            hint={dict.admin.isAvailableHint}
          />
          <Toggle
            checked={draft.is_published}
            onChange={(v) => set("is_published", v)}
            label={dict.admin.isPublished}
            hint={dict.admin.isPublishedHint}
          />
        </div>
      </Section>

      <Section title={dict.admin.images} hint={dict.admin.imagesHint}>
        <ImageManager
          productId={productId}
          images={images}
          savedPaths={product?.image_paths ?? []}
          onChange={setImages}
          error={err("images")}
        />
      </Section>


      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur">
        <button type="submit" disabled={pending} className={buttonClass("primary", "lg")}>
          {pending ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <Save aria-hidden className="size-5" />}
          {pending ? dict.admin.saving : dict.admin.save}
        </button>
        <Link href={`/${locale}/admin`} className={buttonClass("ghost", "lg")}>
          {dict.common.cancel}
        </Link>
      </div>
    </form>
  );
}

function Section({ title, hint, children }: { title?: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      {title && (
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 has-[:checked]:border-brand/40 has-[:checked]:bg-brand-soft/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-5 shrink-0 accent-brand"
      />
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
}

function ImageManager({
  productId,
  images,
  savedPaths,
  onChange,
  error,
}: {
  productId: string;
  images: string[];
  savedPaths: string[];
  onChange: (images: string[]) => void;
  error?: string;
}) {
  const { dict, t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const env = getSupabaseEnv();

  async function upload(files: FileList) {
    const supabase = createBrowserSupabase();
    const room = MAX_IMAGES - images.length;
    const selected = Array.from(files).slice(0, Math.max(0, room));
    setUploading(true);
    setUploadErrors([]);
    const added: string[] = [];
    const failed: string[] = [];
    for (const file of selected) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        failed.push(file.name);
        continue;
      }
      const { blob, ext, type } = await prepareImage(file);
      const path = `products/${productId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(path, blob, { contentType: type, cacheControl: "31536000", upsert: false });
      if (uploadError) failed.push(file.name);
      else added.push(path);
    }
    onChange([...images, ...added]);
    setUploadErrors(failed);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(path: string) {
    onChange(images.filter((p) => p !== path));
    // Files uploaded in this session but never saved would be orphaned, so
    // delete them now. Saved files are deleted by the server on save.
    if (!savedPaths.includes(path)) {
      await createBrowserSupabase().storage.from(PRODUCT_IMAGES_BUCKET).remove([path]);
    }
  }

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.map((path, index) => (
            <li key={path} className="space-y-1.5">
              <div className="relative aspect-square overflow-hidden rounded-xl border border-line bg-canvas">
                {env && (
                  <Image src={publicImageUrl(env, path)} alt="" fill sizes="160px" className="object-cover" />
                )}
                {index === 0 && (
                  <span className="absolute start-1.5 top-1.5 rounded-full bg-ink/80 px-2 py-0.5 text-[11px] font-semibold text-white">
                    {dict.admin.cover}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => remove(path)}
                  aria-label={dict.admin.removeImage}
                  className="absolute end-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-surface/90 text-danger shadow hover:bg-surface"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </div>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => onChange([path, ...images.filter((p) => p !== path)])}
                  className="inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-muted hover:text-ink"
                >
                  <Star aria-hidden className="size-3.5" />
                  {dict.admin.makeCover}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        multiple
        className="peer sr-only"
        id={`upload-${productId}`}
        disabled={uploading || images.length >= MAX_IMAGES}
        onChange={(e) => e.target.files?.length && upload(e.target.files)}
      />
      <label
        htmlFor={`upload-${productId}`}
        className={buttonClass(
          "secondary",
          "md",
          `cursor-pointer peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus ${uploading || images.length >= MAX_IMAGES ? "pointer-events-none opacity-60" : ""}`,
        )}
      >
        {uploading ? <Loader2 aria-hidden className="size-5 animate-spin" /> : <ImagePlus aria-hidden className="size-5" />}
        {uploading ? dict.admin.uploading : dict.admin.uploadImages}
      </label>
      <div aria-live="polite">
        {uploadErrors.map((name) => (
          <p key={name} className="text-sm text-danger">
            {t(dict.admin.uploadFailed, { name })}
          </p>
        ))}
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
