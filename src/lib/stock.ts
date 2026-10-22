/** Products with this many units or fewer are flagged in red in the admin. */
export const LOW_STOCK_THRESHOLD = 15;
export const MAX_STOCK = 1_000_000;

export function isLowStock(stock: number): boolean {
  return stock <= LOW_STOCK_THRESHOLD;
}
