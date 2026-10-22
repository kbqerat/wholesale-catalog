-- SAMPLE DATA FOR LOCAL DEVELOPMENT ONLY.
-- These are not real products. Every name is prefixed with [مثال] / [Exemple]
-- so they are easy to spot and delete. Do not run this on production.
-- `supabase db reset` runs this file automatically after the migrations.

with c as (select id, slug from public.categories)
insert into public.products (id, category_id, name_ar, name_fr, description_ar, description_fr, wholesale_price, is_available, sort_order)
values
  ('00000000-0000-4000-8000-000000000101', (select id from c where slug = 'caps'),
   '[مثال] قبعة قطنية كلاسيكية', '[Exemple] Casquette coton classique',
   'منتج تجريبي للتطوير فقط.', 'Produit fictif pour le développement.', 25, true, 1),
  ('00000000-0000-4000-8000-000000000102', (select id from c where slug = 'caps'),
   '[مثال] قبعة بشبكة', '[Exemple] Casquette trucker',
   'منتج تجريبي للتطوير فقط.', 'Produit fictif pour le développement.', 30, false, 2),
  ('00000000-0000-4000-8000-000000000201', (select id from c where slug = 'bags'),
   '[مثال] حقيبة ظهر', '[Exemple] Sac à dos',
   'منتج تجريبي للتطوير فقط.', 'Produit fictif pour le développement.', 85, true, 1),
  ('00000000-0000-4000-8000-000000000202', (select id from c where slug = 'bags'),
   '[مثال] حقيبة كتف', '[Exemple] Sac bandoulière',
   'منتج تجريبي للتطوير فقط.', 'Produit fictif pour le développement.', 95, true, 2)
on conflict (id) do nothing;

