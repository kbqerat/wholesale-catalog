-- Stock tracking for the seller. Products at or below the low-stock threshold
-- (15, see src/lib/stock.ts) are highlighted in red in the admin area.
-- Existing products start at 0 so the seller is prompted to fill in real stock.

-- ---------------------------------------------------------------------------
-- Stock
-- ---------------------------------------------------------------------------
alter table public.products
  add column stock_quantity integer not null default 0
  check (stock_quantity between 0 and 1000000);

create index products_stock_idx on public.products (stock_quantity);

-- Stock levels are private business data: anonymous visitors may read every
-- product column EXCEPT stock_quantity (column-level privileges; RLS still
-- limits them to published products). Admins use the `authenticated` role.
revoke select on public.products from anon;
grant select (
  id, category_id, name_ar, name_fr, description_ar, description_fr,
  wholesale_price, min_quantity, is_available, is_published, sort_order,
  created_at, updated_at
) on public.products to anon;

-- ---------------------------------------------------------------------------
-- Product save (same as before, now also writing stock_quantity)
-- ---------------------------------------------------------------------------
create or replace function public.admin_save_product(payload jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := (payload ->> 'id')::uuid;
  v_variant jsonb;
  v_image text;
  v_index integer;
  v_removed text[];
begin
  if not public.is_admin() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  insert into public.products as p (
    id, category_id, name_ar, name_fr, description_ar, description_fr,
    wholesale_price, min_quantity, stock_quantity, is_available, is_published, sort_order
  ) values (
    v_id,
    (payload ->> 'category_id')::uuid,
    payload ->> 'name_ar',
    nullif(payload ->> 'name_fr', ''),
    nullif(payload ->> 'description_ar', ''),
    nullif(payload ->> 'description_fr', ''),
    (payload ->> 'wholesale_price')::numeric,
    coalesce((payload ->> 'min_quantity')::integer, 1),
    coalesce((payload ->> 'stock_quantity')::integer, 0),
    coalesce((payload ->> 'is_available')::boolean, true),
    coalesce((payload ->> 'is_published')::boolean, true),
    coalesce((payload ->> 'sort_order')::integer, 0)
  )
  on conflict (id) do update set
    category_id = excluded.category_id,
    name_ar = excluded.name_ar,
    name_fr = excluded.name_fr,
    description_ar = excluded.description_ar,
    description_fr = excluded.description_fr,
    wholesale_price = excluded.wholesale_price,
    min_quantity = excluded.min_quantity,
    stock_quantity = excluded.stock_quantity,
    is_available = excluded.is_available,
    is_published = excluded.is_published,
    sort_order = excluded.sort_order;

  delete from public.product_variants
  where product_id = v_id
    and id not in (
      select (v ->> 'id')::uuid
      from jsonb_array_elements(coalesce(payload -> 'variants', '[]'::jsonb)) v
      where nullif(v ->> 'id', '') is not null
    );

  v_index := 0;
  for v_variant in
    select value from jsonb_array_elements(coalesce(payload -> 'variants', '[]'::jsonb))
  loop
    if nullif(v_variant ->> 'id', '') is null then
      insert into public.product_variants (product_id, label_ar, label_fr, color_hex, is_available, sort_order)
      values (
        v_id,
        v_variant ->> 'label_ar',
        nullif(v_variant ->> 'label_fr', ''),
        nullif(v_variant ->> 'color_hex', ''),
        coalesce((v_variant ->> 'is_available')::boolean, true),
        v_index
      );
    else
      update public.product_variants set
        label_ar = v_variant ->> 'label_ar',
        label_fr = nullif(v_variant ->> 'label_fr', ''),
        color_hex = nullif(v_variant ->> 'color_hex', ''),
        is_available = coalesce((v_variant ->> 'is_available')::boolean, true),
        sort_order = v_index
      where id = (v_variant ->> 'id')::uuid and product_id = v_id;
    end if;
    v_index := v_index + 1;
  end loop;

  with removed as (
    delete from public.product_images
    where product_id = v_id
      and storage_path not in (
        select jsonb_array_elements_text(coalesce(payload -> 'images', '[]'::jsonb))
      )
    returning storage_path
  )
  select coalesce(array_agg(storage_path), '{}') into v_removed from removed;

  v_index := 0;
  for v_image in
    select jsonb_array_elements_text(coalesce(payload -> 'images', '[]'::jsonb))
  loop
    insert into public.product_images (product_id, storage_path, sort_order)
    values (v_id, v_image, v_index)
    on conflict (product_id, storage_path) do update set sort_order = excluded.sort_order;
    v_index := v_index + 1;
  end loop;

  return jsonb_build_object('id', v_id, 'removed_paths', to_jsonb(v_removed));
end;
$$;

revoke all on function public.admin_save_product(jsonb) from public, anon;
grant execute on function public.admin_save_product(jsonb) to authenticated;
