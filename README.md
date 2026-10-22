# Wholesale Catalog

A mobile-first wholesale ("jemla") product catalog for a caps and bags seller. Clients browse products, pick variants and quantities, and send their list to the seller on WhatsApp in one tap. The seller manages products, photos, stock and confirmed orders from a private admin area.

> **This is an inquiry flow, not a checkout.** There are no payments, shipping or automatic order confirmation. The seller confirms availability and agrees on the final order and prices with each client on WhatsApp.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%7C%20Auth%20%7C%20Storage-3FCF8E?logo=supabase&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)

---

## Contents

- [Features](#features)
- [How it works](#how-it-works)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Supabase setup](#supabase-setup)
- [Creating the first admin](#creating-the-first-admin)
- [WhatsApp configuration](#whatsapp-configuration)
- [Seller guide](#seller-guide)
- [Deployment](#deployment)
- [Security model](#security-model)
- [Project structure](#project-structure)
- [Project status](#project-status)

---

## Features

### For clients

- **Bilingual:** Arabic (default, right-to-left) at `/ar` and French at `/fr`.
- **Browse and search** products by category, with photo galleries and variants (colours, sizes…).
- **Selection list** saved in the browser (`localStorage`). It survives refreshes and later visits, and no account is needed.
- **Send to WhatsApp:** one tap opens WhatsApp with a short message in the client's language and a link to an order details page.
- **No prices shown.** Prices are negotiated per client on WhatsApp, and any product can be ordered from 1 unit.

### For the seller

- **Protected admin area** at `/ar/admin` (or `/fr/admin`).
- **Products and categories:** bilingual names and descriptions, up to 12 photos per product (resized in the browser before upload), optional variants with colour swatches, and draft/published states.
- **Stock tracking:** products at 15 units or fewer are flagged as low stock. At 0 they become unavailable automatically, and available again when restocked.
- **Order confirmation:** confirm an order from its WhatsApp link to deduct stock in a single transaction. Cancelling an order puts the units back.

---

## How it works

```text
 Client                         WhatsApp                        Seller
 ──────                         ────────                        ──────
 Browses the catalog
 Adds products to a list ──►  Message + link to an  ──►  Opens the order page
 (saved in the browser)       order details page          sees photos and quantities
                                                           agrees on the order with
                                                           the client on WhatsApp
                                                                 │
                                                                 ▼
                                                       Signed in as admin:
                                                       "Confirm order" deducts stock
```

A WhatsApp link can only carry text, so the product details live on the **order page** (`/ar/order?i=…`). The page is built from the link and the live catalog: nothing is stored until the seller confirms, and the page is hidden from search engines. Items that have become unavailable since being added are flagged in the client's list and left out of the link.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org) (App Router, Cache Components) and React 19 |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Backend | [Supabase](https://supabase.com): Postgres with row level security, Auth, Storage |
| Validation | [Zod](https://zod.dev), with schemas shared by forms and server actions |
| Testing | [Vitest](https://vitest.dev) |
| Icons | [Lucide](https://lucide.dev) |

---

## Getting started

**Requirements:** Node.js 20+ and npm.

```bash
git clone https://github.com/kbqerat/wholesale-catalog.git
cd wholesale-catalog
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run dev                  # http://localhost:3000 redirects to /ar
```

### Sample-data mode

Without Supabase variables the catalog still runs. It shows built-in **sample data** behind a yellow "sample data" banner, every sample product is prefixed with `[مثال]` / `[Exemple]`, and the admin area shows setup instructions. This mode is only for previewing the UI.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Generate route types, then run `tsc --noEmit` |
| `npm test` | Run the unit tests once |
| `npm run test:watch` | Run the unit tests in watch mode |

### Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Project Settings → API. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | The **anon/public** key. It is designed to be public, and row level security protects the data. **Never** put the `service_role` key in this app. |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | To send lists | The seller's WhatsApp number (see [WhatsApp configuration](#whatsapp-configuration)). |
| `NEXT_PUBLIC_STORE_NAME` | No | Store name in the header and page titles. Defaults to "كتالوج الجملة / Catalogue de gros". |

`NEXT_PUBLIC_*` values are baked in at build time. Restart `npm run dev`, or rebuild and redeploy, after changing them.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the migrations in [`supabase/migrations/`](supabase/migrations) **in filename order**, using either method:
   - **SQL editor:** paste each file's contents into the SQL editor and run it.
   - **Supabase CLI:** `supabase link --project-ref <ref>`, then `supabase db push`.
3. **Disable public sign-up:** Authentication → Sign In / Providers → turn off **"Allow new users to sign up"**. The site has no sign-up form, and this also blocks sign-ups made directly against the Supabase API.
4. Copy the project URL and the anon key into `.env.local`.

The migrations create:

- The tables `categories`, `products`, `product_variants`, `product_images`, `admins` and `orders`.
- Row level security policies. The public can **read** categories, plus only **published** products with their variants and images. Every write requires `public.is_admin()`.
- The `admin_save_product` function, which saves a product with its variants and photos in one transaction.
- The **`product-images`** storage bucket. Anyone can read it, but only admins can upload or delete. It rejects files over 5 MB and anything that isn't JPEG, PNG, WebP or AVIF.
- Two initial categories: **قبعات / Casquettes** (`caps`) and **حقائب / Sacs** (`bags`).

[`supabase/seed.sql`](supabase/seed.sql) contains sample products for **local development only**. `supabase db reset` applies it automatically on a local Supabase stack. Do not run it in production.

---

## Creating the first admin

Admins are users listed in the `admins` table. Nobody can add themselves from the website, because the table has no write policies for browser clients.

1. In Supabase, go to **Authentication → Users → Add user → Create new user**. Enter the seller's email and a strong password, and tick "Auto confirm user".
2. In the **SQL editor**, run:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'seller@example.com';
   ```

3. Open `/ar/admin/login` and sign in.

To remove an admin, run `delete from public.admins where user_id = '…';`.

---

## WhatsApp configuration

Set `NEXT_PUBLIC_WHATSAPP_NUMBER` in `.env.local` or in your host's environment settings, then restart or redeploy. Accepted formats:

- `+212612345678`
- `00212612345678`
- `0612345678` (a Moroccan 06/07 number is converted to +212 automatically)

Spaces and dashes are fine. If the variable is missing or invalid, the list page shows a "WhatsApp number not configured" notice instead of a broken link.

The message is URL-encoded into a `https://wa.me/<number>?text=…` link. It contains a greeting, the link to the order details page and a closing line, and WhatsApp shows a preview with the first product's photo. The link uses the address the client is browsing, so it only works for the seller once the site is online (not on `localhost`).

---

## Seller guide

### Adding and updating products

1. Sign in at `/ar/admin`.
2. **Categories:** create or rename categories. The slug is the short Latin name used in links (for example `caps`). A category that still has products cannot be deleted.
3. **Products → New product:**
   - **Category** and **Arabic name** are required. The French name and descriptions are optional, and French falls back to Arabic.
   - **Stock quantity** is required. At 15 or fewer the product is highlighted in red and listed under « مخزون منخفض » (low stock). At 0 it becomes unavailable to clients automatically.
   - **Available in stock:** when off, the product stays visible with an "unavailable" badge and cannot be added to a list.
   - **Published:** when off, the product is hidden from clients (a draft).
   - **Photos:** up to 12. The first photo is the cover; use "Make cover" to change it.
   - **Variants** (colours, sizes…) are optional. Each has an Arabic and French label, an optional colour swatch and its own availability. If a product has variants, clients must choose one.
4. **Save.** The public catalog updates immediately.

Changes made directly in the Supabase dashboard also reach the site, but can take a few minutes because the catalog is cached.

### Confirming orders

1. Each list a client sends gets an order number (for example `K7PQ2M9X`), shown in the WhatsApp message and on the order page.
2. After agreeing with the client, open the link **while signed in as admin**. A seller-only panel shows each product's current stock and lets you adjust quantities (0 removes a product).
3. **« تأكيد الطلب وخصم المخزون »** deducts the stock in one database transaction. Each order number can be confirmed only once. If stock is short, only the available units are deducted (stock never goes below 0) and the order records the shortfall.
4. **Admin → « الطلبات »** lists confirmed orders. **Cancel** puts the deducted units back in stock.
5. **Admin → « مخزون منخفض »** lists products with 15 units or fewer, with a quick restock field.

---

## Deployment

Any Node.js host that supports Next.js 16 works, for example [Vercel](https://vercel.com). Set the environment variables on the host, then build. The build reads the catalog from Supabase to prerender pages, so the Supabase project must be reachable at build time.

---

## Security model

Admin access is checked at three independent layers:

1. **Proxy:** signed-out visitors are redirected away from `/admin`.
2. **Server:** every admin page and server action verifies the session on the server (`getClaims`) and checks `is_admin()` in the database.
3. **Database:** row level security enforces the same rule on every query and on Storage.

No role is ever read from cookies, `localStorage` or user-editable metadata. Stock levels and orders are private: visitors cannot read them, even through the Supabase API.

---

## Project structure

```text
supabase/
  migrations/          schema, RLS, storage bucket, initial categories, orders
  seed.sql             sample products for local development only
src/
  proxy.ts             locale redirect and admin session refresh
  app/[locale]/
    (shop)/            catalog, product page, selection list, order page
    admin/login        seller sign-in
    admin/(panel)/     protected admin pages
  components/          UI (shop/, admin/, shared primitives)
  lib/
    catalog/           types, cached queries, sample data, public server action
    selection/         selection-list reducer (pure) and localStorage store
    admin/             auth (data access layer), server actions, admin queries
    validation/        Zod schemas shared by forms and server actions
    i18n/              locales and Arabic/French dictionaries
    whatsapp.ts        number normalisation and message/URL builder
tests/                 Vitest unit tests
```

---

## Project status

- **Verified locally:** lint, type-check, unit tests (selection quantities, persistence, WhatsApp message and URL encoding, order links, validation, search) and a production build, plus a browser run through the catalog, product, selection and login pages in sample-data mode.
- **Not yet verified against a live Supabase project:** the migrations, RLS policies, admin sign-in, product saving and image uploads. Before sharing the site with clients, follow [Supabase setup](#supabase-setup) and [Creating the first admin](#creating-the-first-admin), then create a test product with a photo.
