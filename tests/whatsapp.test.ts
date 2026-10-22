import { describe, expect, it } from "vitest";
import ar from "@/lib/i18n/dictionaries/ar";
import fr from "@/lib/i18n/dictionaries/fr";
import { buildWhatsAppMessage, buildWhatsAppUrl, normalizeWhatsAppNumber } from "@/lib/whatsapp";

describe("normalizeWhatsAppNumber", () => {
  it.each([
    ["+212612345678", "212612345678"],
    ["+212 6 12-34-56-78", "212612345678"],
    ["00212612345678", "212612345678"],
    ["0612345678", "212612345678"],
    ["07 12 34 56 78", "212712345678"],
    ["(+33) 6 12 34 56 78", "33612345678"],
  ])("normalises %s", (input, expected) => {
    expect(normalizeWhatsAppNumber(input)).toBe(expected);
  });

  it.each([undefined, null, "", "   ", "abc", "12345", "+0612345678", "+2126123456789012345"])(
    "rejects %s",
    (input) => {
      expect(normalizeWhatsAppNumber(input)).toBeNull();
    },
  );
});

describe("buildWhatsAppMessage", () => {
  const orderUrl = "https://example.ma/ar/order?i=11111111111141118111111111111111.12";

  it("is only a greeting, the order link and a closing line (Arabic)", () => {
    const message = buildWhatsAppMessage({ orderUrl, dict: ar });
    expect(message).toBe(
      [ar.whatsapp.greeting, ar.whatsapp.intro, orderUrl, "", ar.whatsapp.closing].join("\n"),
    );
    expect(message.startsWith("السلام عليكم")).toBe(true);
  });

  it("adds the order number before the closing line", () => {
    const lines = buildWhatsAppMessage({ orderUrl, orderRef: "K7PQ2M9X", dict: ar }).split("\n");
    expect(lines.at(-2)).toBe("رقم الطلب: K7PQ2M9X");
    expect(lines.at(-1)).toBe(ar.whatsapp.closing);
  });

  it("uses French wording on the French site", () => {
    const message = buildWhatsAppMessage({ orderUrl, dict: fr });
    expect(message.startsWith("Bonjour,")).toBe(true);
    expect(message.split("\n")).toContain(orderUrl);
  });

  it("puts the link alone on its own line so WhatsApp makes it clickable", () => {
    const lines = buildWhatsAppMessage({ orderUrl, dict: ar }).split("\n");
    expect(lines.filter((l) => l.includes("http"))).toEqual([orderUrl]);
  });
});

describe("buildWhatsAppUrl", () => {
  it("URL-encodes the message so it round-trips exactly", () => {
    const message = buildWhatsAppMessage({
      orderUrl: "https://example.ma/ar/order?i=11111111111141118111111111111111.3-22222222222242228222222222222222.1",
      dict: ar,
    });
    const url = buildWhatsAppUrl("212612345678", message);
    expect(url.startsWith("https://wa.me/212612345678?text=")).toBe(true);
    const encoded = url.split("?text=")[1];
    expect(encoded).not.toMatch(/[\s&#?]/);
    expect(new URL(url).searchParams.get("text")).toBe(message);
  });

  it("encodes characters that would break the query string", () => {
    const url = buildWhatsAppUrl("212612345678", "A & B #1 + 50% ?");
    expect(url).toBe("https://wa.me/212612345678?text=A%20%26%20B%20%231%20%2B%2050%25%20%3F");
  });
});
