"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/i18n-provider";

export function AdminNavLinks({ lowStockCount }: { lowStockCount: number }) {
  const { locale, dict } = useI18n();
  const pathname = usePathname();
  const section = pathname.includes("/admin/categories")
    ? "categories"
    : pathname.includes("/admin/low-stock")
      ? "low-stock"
      : pathname.includes("/admin/orders")
        ? "orders"
        : "products";
  const links = [
    { key: "products", href: `/${locale}/admin`, label: dict.admin.products },
    { key: "orders", href: `/${locale}/admin/orders`, label: dict.admin.ordersNav },
    { key: "low-stock", href: `/${locale}/admin/low-stock`, label: dict.admin.lowStock, count: lowStockCount },
    { key: "categories", href: `/${locale}/admin/categories`, label: dict.admin.categories },
  ];
  return (
    <nav aria-label={dict.admin.title} className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto">
      {links.map((link) => {
        const active = section === link.key;
        return (
          <Link
            key={link.key}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-2.5 pt-1 text-sm font-semibold ${
              active ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {link.label}
            {!!link.count && (
              <span className="num min-w-5 rounded-full bg-danger px-1.5 text-center text-xs font-bold leading-5 text-white">
                {link.count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
