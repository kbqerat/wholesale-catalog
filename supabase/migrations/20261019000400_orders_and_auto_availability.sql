-- Automatic availability and order confirmation.
--
-- * products.in_stock: public, derived (stock > 0). A product with no stock is
--   shown as unavailable automatically and comes back when restocked.
-- * orders: when the seller confirms a client's WhatsApp order, stock is
--   deducted once per order reference; cancelling puts it back.
--
-- Safe to run more than once.

alter table public.products
  add column if not exists in_stock boolean generated always as (stock_quantity > 0) stored;

-- Visitors may also read in_stock (still not stock_quantity).
grant select (in_stock) on public.products to anon;

-- ---------------------------------------------------------------------------
-- Orders (confirmed by the seller)
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  -- Reference generated when the client sends the list; one confirmation each.
  ref text not null unique check (ref ~ '^[A-Z0-9]{8}$'),
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  -- Snapshot: [{product_id, name_ar, name_fr, quantity, unit_price, deducted}]
  items jsonb not null check (jsonb_typeof(items) = 'array'),
  total numeric(12, 2) not null check (total >= 0),
  confirmed_at timestamptz not null default now(),
  confirmed_by uuid references auth.users (id) on delete set null,
  cancelled_at timestamptz
);

create index if not exists orders_confirmed_at_idx on public.orders (confirmed_at desc);

alter table public.orders enable row level security;

drop policy if exists "admins read orders" on public.orders;
create policy "admins read orders"
  on public.orders for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "admins manage orders" on public.orders;
create policy "admins manage orders"
  on public.orders for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

grant select, insert, update on public.orders to authenticated;

-- Confirm an order: deduct stock and record it, atomically.
-- p_items: [{"product_id": uuid, "quantity": int}]
-- Prices come from the database, never from the caller. If stock is short, the
-- available units are deducted (stock never goes below 0) and the shortfall is
-- recorded, so cancelling restores exactly what was taken.
create or replace function public.admin_confirm_order(p_ref text, p_items jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_line jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_deducted integer;
  v_items jsonb := '[]'::jsonb;
  v_total numeric(12, 2) := 0;
  v_order_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if exists (select 1 from public.orders where ref = p_ref) then
    raise exception 'already_confirmed' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order' using errcode = 'P0001';
  end if;

  for v_line in select value from jsonb_array_elements(p_items)
  loop
    v_qty := (v_line ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 10000 then
      raise exception 'invalid_quantity' using errcode = 'P0001';
    end if;

    select * into v_product from public.products
    where id = (v_line ->> 'product_id')::uuid
    for update;
    if not found then
      raise exception 'product_not_found' using errcode = 'P0001';
    end if;

    v_deducted := least(v_product.stock_quantity, v_qty);
    update public.products
      set stock_quantity = stock_quantity - v_deducted
      where id = v_product.id;

    v_items := v_items || jsonb_build_object(
      'product_id', v_product.id,
      'name_ar', v_product.name_ar,
      'name_fr', v_product.name_fr,
      'quantity', v_qty,
      'unit_price', v_product.wholesale_price,
      'deducted', v_deducted
    );
    v_total := v_total + v_product.wholesale_price * v_qty;
  end loop;

  insert into public.orders (ref, items, total, confirmed_by)
  values (p_ref, v_items, v_total, (select auth.uid()))
  returning id into v_order_id;

  return jsonb_build_object('id', v_order_id, 'ref', p_ref);
end;
$$;

-- Cancel a confirmed order and put the deducted stock back.
create or replace function public.admin_cancel_order(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
  v_line jsonb;
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.status <> 'confirmed' then
    raise exception 'not_cancellable' using errcode = 'P0001';
  end if;

  for v_line in select value from jsonb_array_elements(v_order.items)
  loop
    -- Products deleted since the order are simply skipped.
    update public.products
      set stock_quantity = least(1000000, stock_quantity + coalesce((v_line ->> 'deducted')::integer, 0))
      where id = (v_line ->> 'product_id')::uuid;
  end loop;

  update public.orders set status = 'cancelled', cancelled_at = now() where id = p_order_id;
end;
$$;

revoke all on function public.admin_confirm_order(text, jsonb) from public, anon;
revoke all on function public.admin_cancel_order(uuid) from public, anon;
grant execute on function public.admin_confirm_order(text, jsonb) to authenticated;
grant execute on function public.admin_cancel_order(uuid) to authenticated;
