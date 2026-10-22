-- Every product shows its price (no more "price on request"), and every
-- product can be ordered from 1 unit.
--
-- Before running: give a price to any product that has none, otherwise the
-- NOT NULL change fails. Check with:
--   select id, name_ar from public.products where wholesale_price is null;

update public.products set min_quantity = 1 where min_quantity <> 1;

alter table public.products alter column wholesale_price set not null;
