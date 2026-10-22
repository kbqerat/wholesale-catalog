import { AlertTriangle } from "lucide-react";
import { interpolate } from "@/lib/i18n/config";
import type { Dictionary } from "@/lib/i18n/dictionaries/ar";
import { isLowStock } from "@/lib/stock";

/** Stock level for the admin: red with a warning icon when low or empty. */
export function StockBadge({ stock, dict }: { stock: number; dict: Dictionary }) {
  if (!isLowStock(stock)) {
    return (
      <span className="inline-flex items-center rounded-full bg-ink/5 px-2.5 py-0.5 text-xs font-semibold text-ink">
        <span className="num">{interpolate(dict.admin.stockCount, { count: stock })}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2.5 py-0.5 text-xs font-bold text-white">
      <AlertTriangle aria-hidden className="size-3.5" />
      {stock === 0 ? dict.admin.outOfStock : dict.admin.lowStock}
      <span className="num">· {stock}</span>
    </span>
  );
}
