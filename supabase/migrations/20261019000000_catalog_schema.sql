-- Wholesale catalog schema: categories, products, variants, images, admins,
-- row level security, storage bucket and the admin save RPC.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Admins
-- Membership is managed only from the SQL editor / service role. There are no
-- insert/update/delete policies, so no browser client can grant itself access.
-- ---------------------------------------------------------------------------
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy "admins can read their own membership"
  on public.admins for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Categories
-- ---------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 60),
  name_ar text not null check (char_length(name_ar) between 1 and 80),
  name_fr text not null check (char_length(name_fr) between 1 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Products
-- is_published: visible to the public at all (drafts stay hidden).
-- is_available: in stock; unavailable products are shown but cannot be added.
-- wholesale_price: MAD, null means "price on request".
-- ---------------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id) on delete restrict,
  name_ar text not null check (char_length(name_ar) between 1 and 120),
  name_fr text check (name_fr is null or char_length(name_fr) between 1 and 120),
  description_ar text check (description_ar is null or char_length(description_ar) <= 2000),
  description_fr text check (description_fr is null or char_length(description_fr) <= 2000),
  wholesale_price numeric(10, 2)
    check (wholesale_price is null or (wholesale_price >= 0 and wholesale_price < 1000000)),
  min_quantity integer not null default 1 check (min_quantity between 1 and 10000),
  is_available boolean not null default true,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_idx on public.products (category_id);
create index products_published_idx on public.products (is_published, sort_order);

create trigger products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Variants (e.g. a colour, a size, or "Black / L")
-- ---------------------------------------------------------------------------
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label_ar text not null check (char_length(label_ar) between 1 and 60),
  label_fr text check (label_fr is null or char_length(label_fr) between 1 and 60),
  color_hex text check (color_hex is null or color_hex ~ '^#[0-9a-fA-F]{6}$'),
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index product_variants_product_idx on public.product_variants (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- Images (files live in the product-images storage bucket)
-- ---------------------------------------------------------------------------
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null check (char_length(storage_path) <= 300),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, storage_path)
);

create index product_images_product_idx on public.product_images (product_id, sort_order);

-- ---------------------------------------------------------------------------
-- Row level security
-- Public (anon) can only read categories and published products with their
-- variants and images. Every write requires public.is_admin().
-- ---------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;

create policy "categories are public"
  on public.categories for select
  to anon, authenticated
  using (true);

create policy "admins manage categories"
  on public.categories for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "published products are public"
  on public.products for select
  to anon, authenticated
  using (is_published or (select public.is_admin()));

create policy "admins manage products"
  on public.products for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "variants of published products are public"
  on public.product_variants for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (p.is_published or (select public.is_admin()))
    )
  );

create policy "admins manage variants"
  on public.product_variants for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "images of published products are public"
  on public.product_images for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_id and (p.is_published or (select public.is_admin()))
    )
  );

create policy "admins manage images"
  on public.product_images for all
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Explicit grants (RLS above still decides which rows are visible/writable).
grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.product_variants, public.product_images
  to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_variants, public.product_images
  to authenticated;
grant select on public.admins to authenticated;

-- ---------------------------------------------------------------------------
-- Atomic product save used by the admin area.
-- SECURITY INVOKER: runs with the caller's rights, so the RLS policies above
-- apply in addition to the explicit is_admin() check.
-- Returns the product id and the storage paths of images that were removed so
-- the server can delete those files.
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
    wholesale_price, min_quantity, is_available, is_published, sort_order
  ) values (
    v_id,
    (payload ->> 'category_id')::uuid,
    payload ->> 'name_ar',
    nullif(payload ->> 'name_fr', ''),
    nullif(payload ->> 'description_ar', ''),
    nullif(payload ->> 'description_fr', ''),
    (payload ->> 'wholesale_price')::numeric,
    coalesce((payload ->> 'min_quantity')::integer, 1),
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
    is_available = excluded.is_available,
    is_published = excluded.is_published,
    sort_order = excluded.sort_order;

  -- Variants: delete the ones no longer present, upsert the rest (ids stay
  -- stable so clients' saved selections keep pointing at the same variant).
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

  -- Images: remove rows that are gone, then upsert order.
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

-- ---------------------------------------------------------------------------
-- Storage: public-read bucket for product photos, admin-only writes.
-- Public buckets serve files by URL without a select policy, and since there
-- is no public select policy, anonymous users cannot list the bucket.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "admins read product images"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));

create policy "admins upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "admins update product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()))
  with check (bucket_id = 'product-images' and (select public.is_admin()));

create policy "admins delete product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images' and (select public.is_admin()));
