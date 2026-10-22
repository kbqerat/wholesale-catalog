import { z } from "zod";
import { MAX_STOCK } from "../stock";

/**
 * Shared by the admin forms (instant feedback) and the server actions (the
 * authoritative check). Error messages are dictionary keys under `errors`.
 */

/** Remove control characters; keep line breaks only when `multiline`. */
export function sanitizeText(value: string, { multiline = false } = {}): string {
  const withoutControl = value.replace(
    multiline ? /[\u0000-\u0009\u000b-\u001f\u007f]/g : /[\u0000-\u001f\u007f]/g,
    multiline ? "" : " ",
  );
  if (multiline) {
    return withoutControl
      .replace(/\r\n?/g, "\n")
      .split("\n")
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  return withoutControl.replace(/\s+/g, " ").trim();
}

const line = (max: number) =>
  z
    .string()
    .transform((v) => sanitizeText(v))
    .pipe(z.string().min(1, "required").max(max, "too_long"));

const optionalLine = (max: number) =>
  z
    .string()
    .optional()
    .transform((v) => sanitizeText(v ?? ""))
    .pipe(z.string().max(max, "too_long"))
    .transform((v) => (v === "" ? null : v));

const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .transform((v) => sanitizeText(v ?? "", { multiline: true }))
    .pipe(z.string().max(max, "too_long"))
    .transform((v) => (v === "" ? null : v));

const uuid = z.uuid("invalid");

/** Whole number of units in stock, 0 or more. */
export const stockSchema = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const text = String(v).trim().replace(/\s/g, "");
    if (text === "") {
      ctx.addIssue({ code: "custom", message: "required" });
      return z.NEVER;
    }
    if (!/^\d{1,7}$/.test(text) || Number(text) > MAX_STOCK) {
      ctx.addIssue({ code: "custom", message: "invalid_stock" });
      return z.NEVER;
    }
    return Number(text);
  });

export const IMAGE_PATH_RE = /^products\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|jpeg|png|webp|avif)$/;
export const MAX_IMAGES = 12;
export const MAX_VARIANTS = 50;

export const variantSchema = z.object({
  id: uuid.nullable().optional().transform((v) => v ?? null),
  label_ar: line(60),
  label_fr: optionalLine(60),
  color_hex: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v ? v.trim() : null))
    .pipe(z.string().regex(/^#[0-9a-fA-F]{6}$/, "invalid_color").nullable()),
  is_available: z.boolean(),
});

export const productSchema = z
  .object({
    id: uuid,
    category_id: z.string().min(1, "required").pipe(uuid),
    name_ar: line(120),
    name_fr: optionalLine(120),
    description_ar: optionalText(2000),
    description_fr: optionalText(2000),
    stock_quantity: stockSchema,
    is_available: z.boolean(),
    is_published: z.boolean(),
    // Products are standard (no colour/size variants are managed in the
    // admin). Saving always sends an empty list.
    variants: z.array(variantSchema).max(MAX_VARIANTS, "too_many").optional().default([]),
    images: z.array(z.string()).max(MAX_IMAGES, "too_many"),
  })
  .superRefine((product, ctx) => {
    product.images.forEach((path, index) => {
      if (!IMAGE_PATH_RE.test(path) || !path.startsWith(`products/${product.id}/`)) {
        ctx.addIssue({ code: "custom", message: "invalid", path: ["images", index] });
      }
    });
    if (new Set(product.images).size !== product.images.length) {
      ctx.addIssue({ code: "custom", message: "invalid", path: ["images"] });
    }
  });

export type ProductInput = z.input<typeof productSchema>;
export type ProductData = z.output<typeof productSchema>;

export const categorySchema = z.object({
  id: uuid.nullable().optional().transform((v) => v ?? null),
  name_ar: line(80),
  name_fr: line(80),
});

/**
 * URL-safe identifier for a category, derived from its French name
 * ("Sacs à dos" -> "sacs-a-dos"). Used in shareable filter links (?c=...).
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");
}

export type CategoryData = z.output<typeof categorySchema>;

export type FieldErrors = Record<string, string>;

/** Flatten zod issues to `{ "variants.0.label_ar": "required" }`. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}
