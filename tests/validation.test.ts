import { describe, expect, it } from "vitest";
import { categorySchema, productSchema, sanitizeText, slugify, stockSchema, toFieldErrors } from "@/lib/validation/admin";
import { LOW_STOCK_THRESHOLD, isLowStock } from "@/lib/stock";
import { CAP_ID } from "./fixtures";

const CATEGORY_ID = "55555555-5555-4555-8555-555555555555";
const IMG = `products/${CAP_ID}/66666666-6666-4666-8666-666666666666.webp`;

function validProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: CAP_ID,
    category_id: CATEGORY_ID,
    name_ar: "قبعة",
    name_fr: "",
    description_ar: "",
    description_fr: "",
    stock_quantity: "40",
    is_available: true,
    is_published: true,
    variants: [],
    images: [IMG],
    ...overrides,
  };
}

describe("sanitizeText", () => {
  it("collapses whitespace and strips control characters on single lines", () => {
    expect(sanitizeText("  Casquette\u0000  noire\n ")).toBe("Casquette noire");
  });
  it("keeps paragraph breaks in multi-line text", () => {
    expect(sanitizeText("Ligne 1  \r\n\r\n\r\n\r\nLigne\t 2\u0007", { multiline: true })).toBe("Ligne 1\n\nLigne 2");
  });
});

describe("productSchema", () => {
  it("accepts a valid product and normalises optional fields to null", () => {
    const data = productSchema.parse(validProduct());
    expect(data).toMatchObject({ name_fr: null, description_ar: null });
    expect(data).not.toHaveProperty("wholesale_price");
    expect(data).not.toHaveProperty("min_quantity");
  });

  it("reports field errors as dictionary keys", () => {
    const result = productSchema.safeParse(
      validProduct({ name_ar: "   ", category_id: "" }),
    );
    expect(result.success).toBe(false);
    const errors = toFieldErrors(result.error!);
    expect(errors).toMatchObject({
      name_ar: "required",
      category_id: "required",
    });
  });

  it("validates variants", () => {
    const result = productSchema.safeParse(
      validProduct({ variants: [{ id: null, label_ar: "", label_fr: "", color_hex: "red", is_available: true }] }),
    );
    const errors = toFieldErrors(result.error!);
    expect(errors["variants.0.label_ar"]).toBe("required");
    expect(errors["variants.0.color_hex"]).toBe("invalid_color");
  });

  it("only accepts image paths inside this product's folder", () => {
    const otherProduct = "products/77777777-7777-4777-8777-777777777777/66666666-6666-4666-8666-666666666666.webp";
    expect(productSchema.safeParse(validProduct({ images: [otherProduct] })).success).toBe(false);
    expect(productSchema.safeParse(validProduct({ images: ["../../etc/passwd"] })).success).toBe(false);
    expect(productSchema.safeParse(validProduct({ images: [IMG, IMG] })).success).toBe(false);
  });

  it("rejects over-long names", () => {
    expect(productSchema.safeParse(validProduct({ name_ar: "a".repeat(121) })).success).toBe(false);
  });
});

describe("categorySchema", () => {
  it("requires both names", () => {
    const result = categorySchema.safeParse({ name_ar: " ", name_fr: "" });
    expect(toFieldErrors(result.error!)).toMatchObject({ name_ar: "required", name_fr: "required" });
    expect(categorySchema.parse({ name_ar: "قبعات", name_fr: " Casquettes " }).name_fr).toBe("Casquettes");
  });
});

describe("slugify", () => {
  it.each([
    ["Casquettes", "casquettes"],
    ["Sacs à dos", "sacs-a-dos"],
    ["  Été / Hiver 2026 ", "ete-hiver-2026"],
    ["قبعات", ""],
  ])("%j -> %j", (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe("productSchema without variants", () => {
  it("defaults variants to an empty list when not sent", () => {
    const { variants: _variants, ...rest } = validProduct();
    expect(productSchema.parse(rest).variants).toEqual([]);
  });
});

describe("stock", () => {
  it.each([
    ["0", 0],
    ["15", 15],
    [" 1200 ", 1200],
    [40, 40],
  ])("parses %j", (input, expected) => {
    expect(stockSchema.parse(input)).toBe(expected);
  });

  it.each(["", "-1", "2.5", "abc", "99999999"])("rejects %j", (input) => {
    expect(stockSchema.safeParse(input).success).toBe(false);
  });

  it("is required on products", () => {
    const errors = toFieldErrors(productSchema.safeParse(validProduct({ stock_quantity: "" })).error!);
    expect(errors.stock_quantity).toBe("required");
    expect(productSchema.parse(validProduct()).stock_quantity).toBe(40);
  });

  it("flags 15 units or fewer as low stock", () => {
    expect(LOW_STOCK_THRESHOLD).toBe(15);
    expect(isLowStock(0)).toBe(true);
    expect(isLowStock(15)).toBe(true);
    expect(isLowStock(16)).toBe(false);
  });
});
