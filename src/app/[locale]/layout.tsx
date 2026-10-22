import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { IBM_Plex_Sans_Arabic } from "next/font/google";
import { I18nProvider } from "@/components/i18n-provider";
import { dirFor, isLocale, locales } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { storeName } from "@/lib/site";
import "../globals.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-arabic",
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  // Root param getter: known at build time, unlike the full `params` of
  // routes with dynamic segments below this layout.
  const locale = await rootLocale();
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  const name = storeName(dict);
  return {
    title: { default: name, template: `%s · ${name}` },
    description: dict.meta.description,
    alternates: { languages: { ar: "/ar", fr: "/fr" } },
  };
}

export const viewport: Viewport = {
  themeColor: "#f8f6f2",
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);

  return (
    <html lang={locale} dir={dirFor(locale)} className={plexArabic.variable}>
      <body className="min-h-dvh font-sans antialiased">
        <I18nProvider locale={locale} dict={dict}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
