-- The two initial categories. The seller can rename, reorder or add more from
-- the admin area.
insert into public.categories (slug, name_ar, name_fr, sort_order)
values
  ('caps', 'قبعات', 'Casquettes', 1),
  ('bags', 'حقائب', 'Sacs', 2)
on conflict (slug) do nothing;
