-- Prices are no longer shown or entered on the site: the seller agrees on the
-- price with each client on WhatsApp. The existing price column is kept (old
-- values stay in the database) but becomes optional again, and confirming an
-- order no longer computes a total.
--
-- Safe to run more than once.

alter table public.products alter column wholesale_price drop not null;

-- Same as before, without prices: items keep product, quantity and the units
-- actually taken from stock; total stays 0.
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
      'deducted', v_deducted
    );
  end loop;

  insert into public.orders (ref, items, total, confirmed_by)
  values (p_ref, v_items, 0, (select auth.uid()))
  returning id into v_order_id;

  return jsonb_build_object('id', v_order_id, 'ref', p_ref);
end;
$$;

revoke all on function public.admin_confirm_order(text, jsonb) from public, anon;
grant execute on function public.admin_confirm_order(text, jsonb) to authenticated;
