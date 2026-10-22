import { Suspense } from "react";
import Form from "next/form";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, ClipboardList, SearchX } from "lucide-react";
import { DeleteButton } from "@/components/admin/delete-button";
import { Badge, EmptyState, buttonClass, inputClass } from "@/components/ui";
import { cancelOrderAction } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/admin/auth";
import { getOrders } from "@/lib/admin/queries";
import { formatDateTime } from "@/lib/format";
import { interpolate, isLocale, pickLocalized, type Locale } from "@/lib/i18n/config";
import { getDictionary, type Dictionary } from "@/lib/i18n/get-dictionary";
import {
  ORDERS_PER_PAGE,
  hasActiveFilters,
  orderFiltersQuery,
  parseOrderFilters,
  type OrderFilters,
} from "@/lib/admin/order-filters";
import { AdminPageSkeleton } from "@/components/admin/admin-page-skeleton";

// Admin data is read per request: stream it so navigating between admin pages is instant.
export default function OrdersPage(props: PageProps<"/[locale]/admin/orders">) {
  return (
    <Suspense fallback={<AdminPageSkeleton />}>
      <OrdersContent {...props} />
    </Suspense>
  );
}

async function OrdersContent({ params, searchParams }: PageProps<"/[locale]/admin/orders">) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isLocale(locale)) notFound();
  const filters = parseOrderFilters(query);
  const { supabase } = await requireAdmin(locale);
  const [dict, { orders, total }] = await Promise.all([getDictionary(locale), getOrders(supabase, filters)]);
  const pages = Math.max(1, Math.ceil(total / ORDERS_PER_PAGE));
  // A page number past the end (e.g. after cancelling or filtering): show the last page.
  if (filters.page > pages && total > 0) redirect(`/${locale}/admin/orders${orderFiltersQuery(filters, pages)}`);
  const filtered = hasActiveFilters(filters);

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold">{dict.admin.ordersTitle}</h1>
        <p className="text-sm text-muted">{dict.admin.ordersIntro}</p>
      </div>

      {(total > 0 || filtered) && <OrderFiltersForm locale={locale} dict={dict} filters={filters} />}

      {orders.length === 0 ? (
        filtered ? (
          <EmptyState
            icon={<SearchX className="size-7" />}
            title={dict.admin.noMatchingOrders}
            action={
              <Link href={`/${locale}/admin/orders`} className={buttonClass("secondary")}>
                {dict.admin.clearFilters}
              </Link>
            }
          />
        ) : (
          <EmptyState icon={<ClipboardList className="size-7" />} title={dict.admin.noOrders} />
        )
      ) : (
        <>
          <p className="text-sm text-muted" role="status">
            {interpolate(dict.admin.ordersCount, { count: total })}
          </p>
          <ul className="space-y-3">
            {orders.map((order) => {
              const cancelled = order.status === "cancelled";
              const units = order.items.reduce((n, i) => n + i.quantity, 0);
              return (
                <li
                  key={order.id}
                  className={`space-y-3 rounded-2xl border bg-surface p-4 ${cancelled ? "border-line opacity-70" : "border-line"}`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="num font-bold tracking-wide">{interpolate(dict.admin.orderRef, { ref: order.ref })}</span>
                    {cancelled ? (
                      <Badge tone="warn">{dict.admin.statusCancelled}</Badge>
                    ) : (
                      <Badge tone="success">{dict.admin.statusConfirmed}</Badge>
                    )}
                    <span className="text-xs text-muted">
                      {interpolate(dict.admin.confirmedOn, { date: formatDateTime(order.confirmed_at, locale) })}
                      {order.cancelled_at &&
                        ` · ${interpolate(dict.admin.cancelledOn, { date: formatDateTime(order.cancelled_at, locale) })}`}
                    </span>
                  </div>
                  <ul className="divide-y divide-line text-sm">
                    {order.items.map((item) => (
                      <li key={item.product_id} className="flex flex-wrap items-baseline gap-x-3 py-1.5">
                        <span className="min-w-0 flex-1">{pickLocalized(locale, item.name_ar, item.name_fr)}</span>
                        <span className="num text-muted">
                          × {item.quantity}
                        </span>
                        {item.deducted < item.quantity && (
                          <span className="basis-full text-xs font-semibold text-danger">
                            {interpolate(dict.admin.shortfall, { deducted: item.deducted })}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                    <span className="text-sm">
                      {interpolate(dict.selection.unitsCount, { count: units })}
                    </span>
                    {!cancelled && (
                      <div className="flex flex-wrap items-center gap-2">
                        <DeleteButton
                          id={order.id}
                          action={cancelOrderAction}
                          label={dict.admin.cancelOrder}
                          confirmMessage={interpolate(dict.admin.cancelOrderConfirm, { ref: order.ref })}
                        />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination locale={locale} dict={dict} filters={filters} pages={pages} />
        </>
      )}
    </div>
  );
}

function OrderFiltersForm({ locale, dict, filters }: { locale: Locale; dict: Dictionary; filters: OrderFilters }) {
  return (
    // Keyed on the filters so the fields show the applied values after any navigation.
    <Form
      key={orderFiltersQuery(filters, 1)}
      action={`/${locale}/admin/orders`}
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-3 sm:p-4"
    >
      <label className="min-w-36 flex-1 space-y-1.5 text-sm font-semibold">
        <span className="block">{dict.admin.filterStatus}</span>
        <select name="status" defaultValue={filters.status} className={inputClass}>
          <option value="all">{dict.admin.filterAll}</option>
          <option value="confirmed">{dict.admin.statusConfirmed}</option>
          <option value="cancelled">{dict.admin.statusCancelled}</option>
        </select>
      </label>
      <label className="min-w-36 flex-1 space-y-1.5 text-sm font-semibold">
        <span className="block">{dict.admin.filterFrom}</span>
        <input type="date" name="from" defaultValue={filters.from ?? ""} max={filters.to ?? undefined} className={inputClass} />
      </label>
      <label className="min-w-36 flex-1 space-y-1.5 text-sm font-semibold">
        <span className="block">{dict.admin.filterTo}</span>
        <input type="date" name="to" defaultValue={filters.to ?? ""} min={filters.from ?? undefined} className={inputClass} />
      </label>
      <div className="flex gap-2">
        <button type="submit" className={buttonClass("primary")}>
          {dict.admin.applyFilters}
        </button>
        {hasActiveFilters(filters) && (
          <Link href={`/${locale}/admin/orders`} className={buttonClass("ghost")}>
            {dict.admin.clearFilters}
          </Link>
        )}
      </div>
    </Form>
  );
}

function Pagination({
  locale,
  dict,
  filters,
  pages,
}: {
  locale: Locale;
  dict: Dictionary;
  filters: OrderFilters;
  pages: number;
}) {
  if (pages <= 1) return null;
  const href = (page: number) => `/${locale}/admin/orders${orderFiltersQuery(filters, page)}`;
  const previous = filters.page > 1 ? filters.page - 1 : null;
  const next = filters.page < pages ? filters.page + 1 : null;
  const disabled = `${buttonClass("secondary", "sm")} pointer-events-none opacity-40`;
  return (
    <nav aria-label={dict.admin.pagination} className="flex items-center justify-between gap-3">
      {previous ? (
        <Link href={href(previous)} className={buttonClass("secondary", "sm")}>
          <ChevronRight aria-hidden className="size-4 ltr:rotate-180" />
          {dict.admin.previousPage}
        </Link>
      ) : (
        <span aria-hidden className={disabled}>
          <ChevronRight className="size-4 ltr:rotate-180" />
          {dict.admin.previousPage}
        </span>
      )}
      <span className="num text-sm text-muted">{interpolate(dict.admin.pageOf, { page: filters.page, pages })}</span>
      {next ? (
        <Link href={href(next)} className={buttonClass("secondary", "sm")}>
          {dict.admin.nextPage}
          <ChevronLeft aria-hidden className="size-4 ltr:rotate-180" />
        </Link>
      ) : (
        <span aria-hidden className={disabled}>
          {dict.admin.nextPage}
          <ChevronLeft className="size-4 ltr:rotate-180" />
        </span>
      )}
    </nav>
  );
}
