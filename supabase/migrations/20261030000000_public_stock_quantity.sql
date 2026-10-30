-- Clients see how many units are left, so the shop can warn them before they
-- ask for more than the stock. Visitors may now read stock_quantity (RLS still
-- limits them to published products).
--
-- Run this BEFORE deploying the matching site version: the public catalog
-- query reads stock_quantity and fails without this grant.
--
-- Safe to run more than once.

grant select (stock_quantity) on public.products to anon;
