# Restaurant Apps

A full restaurant platform in a single Next.js app — public ordering website, customer accounts, and a staff dashboard (POS, kitchen display, tables, reports) — all served from one codebase and one database.

- **Customer side** — browse the menu, add to cart, checkout, track an order, leave reviews.
- **Staff side** — take counter orders, run the kitchen screen, seat tables, print invoices, read sales reports.
- **Owner side** — manage menu, staff, customers, site settings, and the sales ledger.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19, Turbopack) |
| Language | TypeScript |
| Database | MongoDB via Mongoose 9 |
| Validation | Zod 4 (shared by server and forms) |
| Auth | JWT in httpOnly cookies, bcrypt password hashes |
| Client state | Zustand (cart, settings) + TanStack Query |
| Forms | React Hook Form + Zod resolver |
| Styling | Tailwind CSS 4 + plain CSS files per feature |
| Images | Cloudinary |
| SMS / OTP | BulkSMSBD |
| Hosting | Vercel |

---

## Quick start

```bash
# 1. install
npm install

# 2. configure — copy the sample and fill in your own values
cp .env.example .env

# 3. run
npm run dev          # http://localhost:3000
```

The first admin account can be created without a token **only while the database has zero admins**. Once one exists, that door closes permanently and only a `superadmin` can create more.

### Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build — fails on any TypeScript error |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint over the whole repo |
| `npm run verify:orders` | 31 integration checks for order numbering, cooldown, and the sales ledger. Runs against a separate test database and cleans up after itself — it never touches production data. |

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | MongoDB connection string |
| `JWT_SECRET` | Fallback signing key |
| `JWT_ADMIN_SECRET` / `JWT_STAFF_SECRET` | Separate keys per audience (recommended) |
| `BCRYPT_SALT_ROUND` | Password hashing cost |
| `CLOUDINARY_*` | Image uploads — without these, no image can be uploaded |
| `BULKSMSBD_*`, `SMS_ENABLED` | OTP delivery. With `SMS_ENABLED=false` the code is printed to the console instead, so local dev needs no SMS credits. |
| `NEXT_PUBLIC_SITE_URL` | Canonical domain for SEO tags and the sitemap. On Vercel it falls back to the deployment URL automatically. |
| `RESTAURANT_TIMEZONE` | Business clock, defaults to `Asia/Dhaka` |

See `.env.example` for the full annotated list.

---

## Folder architecture

The app follows a **layered backend inside a Next.js frontend**. Routes stay thin; the real work lives in controllers and services.

```
src/
├── app/                        Next.js App Router — everything URL-addressable
│   ├── (site)/                 Public website (route group, no URL segment)
│   │   ├── page.tsx            Home — server-rendered, ISR 5 min
│   │   ├── foods/              Menu list + /foods/[id] detail
│   │   ├── cart/ checkout/     Cart and checkout flow
│   │   ├── account/            Logged-in customer area
│   │   ├── track-order/        Public order tracking (order no. + phone)
│   │   ├── login/ registration/ forgot-password/
│   │   └── about/ contact/ terms/ privacy/ refund/
│   │
│   ├── dashboard/              Staff & owner dashboard (one folder per screen)
│   │   ├── orders/ kitchen/ pos/ tables/
│   │   ├── menu/ customers/ reviews/ messages/
│   │   ├── reports/ settings/ admins/ banners/ videos/ legal/
│   │   └── roles.ts            Which role sees which menu item
│   │
│   ├── api/v1/                 75 route handlers — the entire REST API
│   ├── components/             React components
│   │   ├── Clients/            Public site
│   │   ├── DashBoard/          Dashboard screens
│   │   └── Admins/
│   ├── Layout/                 Shared shells and modals
│   ├── robots.ts sitemap.ts    Generated at build time
│   └── layout.tsx globals.css
│
├── controllers/                HTTP layer: auth check → validate → call service → respond
├── services/                   Business logic and all database access
├── models/                     Mongoose schemas and indexes
├── interfaces/                 Shared TypeScript types and constants
├── validations/                Zod schemas — used by BOTH the API and the forms
│
├── lib/                        Framework-free helpers
│   ├── apiHandler.ts           catchAsync, parseBody, splitQuery, assertObjectId
│   ├── apiError.ts             ApiError + BadRequest/Unauthorized/NotFound/…
│   ├── sendResponse.ts         The single JSON response envelope
│   ├── tokens.ts               JWT sign/verify, three audiences
│   ├── rateLimit.ts            Database-backed per-IP limits
│   ├── businessTime.ts         "Today" in the restaurant's timezone, not UTC
│   ├── safeQuery.ts            Escapes regex input, whitelists sortBy
│   ├── textGuard.ts            Word counting and link detection
│   └── paginationHelper.ts phone.ts upload.ts …
│
├── middlewares/                requireAuth (staff), requireUser (customer)
├── config/                     db, cloudinary, env, permissions, business rules,
│                               site URL, BD districts, legal page defaults
├── store/                      Zustand stores — cart, settings
├── proxy.ts                    Runs before every request (Next.js 16's middleware)
└── utils/

scripts/                        verify-orders.ts — the integration suite
public/                         Static assets
```

### How one request flows

```
Browser
   │
   ▼
src/proxy.ts                 blocks scanners, burst-limits, adds security headers
   │
   ▼
app/api/v1/…/route.ts        thin — just picks the controller method
   │
   ▼
controllers/*.controller.ts  requireRole() → parseBody(zodSchema) → call service
   │
   ▼
services/*.service.ts        business rules + every database query
   │
   ▼
models/*.model.ts            Mongoose schema
```

Four rules keep this consistent:

1. **Routes never contain logic.** A `route.ts` only forwards to a controller.
2. **Controllers never touch the database.** They check permission, validate input, and format the response.
3. **Services never know about HTTP.** They take plain arguments and throw `ApiError`; `catchAsync` turns that into the right status code.
4. **One response shape, everywhere** — `{ success, message, data?, meta?, errorMessages? }`. The frontend never has to guess.

### Validation is written once

Every Zod schema in `src/validations/` is the resolver for its React Hook Form **and** the parser for its API route. A rule changed in one file changes both sides, so the browser and the server can never disagree about what is valid.

---

## Roles and permissions

Two account types share one token format, defined in `src/config/permissions.ts` and enforced in `src/middlewares/requireAuth.ts`.

| Group | Roles | Can do |
|---|---|---|
| `OWNER_ONLY` | superadmin | Delete orders and customers, purge old data, manage admins and staff |
| `MANAGER_UP` | superadmin, admin, manager | Menu, settings, discounts, contact inbox |
| `CASHIER_UP` | + cashier, waiter | POS orders, payments, seating, invoices |
| `KITCHEN` | + chef | Kitchen queue, mark items ready |
| `FLOOR` | all of the above | Order status changes, step by step |
| `ANY_STAFF` | + viewOnly, cleaner | Read-only screens |

Order status transitions are role-gated individually: a chef can move an order to `preparing` and `ready` but can never confirm or cancel one, and a waiter can never claim the food is cooked.

Customers use a **separate cookie and a separate signing key** (`user_token` vs `access_token`) with an `aud` claim, so a staff token can never be used on a customer route, or the reverse.

---

## API overview

All endpoints live under `/api/v1/`. They return the same envelope and never get cached by the CDN.

| Group | Notable endpoints |
|---|---|
| Menu | `foods`, `foods/[id]`, `foods/[id]/variations`, `categories` — `GET` public, writes are manager+ |
| Orders | `orders`, `orders/pos`, `orders/[id]/status`, `orders/kitchen`, `orders/track`, `orders/cooldown` |
| Ledger | `orders/ledger` (daily sales book), `orders/maintenance` (archive old orders) |
| Customers | `users/register`, `users/login`, `users/otp/send`, `users/me`, `users/password/*` |
| Reviews | `reviews` (public read, customer write), `reviews/all` (moderation) |
| Staff | `admins`, `staffs`, plus their `login` routes |
| Shop | `tables`, `banners`, `videos`, `settings`, `legal/[slug]`, `contact` |
| Reports | `reports/sales`, `reports/chef`, `reports/staff`, `reports/tables` |
| Bulk delete | `orders`, `users`, `reviews`, `contact` each expose `POST …/bulk-delete` with `{ ids: [...] }`, max 100 per call |

### Built-in protections

- **Rate limits** per IP, stored in the database so every serverless instance shares one count — OTP 5/hour, login 10/10 min, orders 8/10 min, contact 3/hour.
- **Order cooldown** — 3 minutes between web orders from the same phone number, so a double-tap never sends two tickets to the kitchen. The checkout page shows a live countdown instead of failing after submit. POS is deliberately exempt.
- **Atomic order numbers** — `ORD-260909-0007` comes from a MongoDB `$inc` counter, not a count query, so simultaneous checkouts can never collide.
- **Sales ledger** — every finished order's totals are folded into a daily document that is never deleted. Old orders can be purged for space without losing a single taka of history.
- **Contact messages** — max 500 words, and links of any form are rejected (URLs, `www.`, markdown, and obfuscations like `example (dot) com`).

---

## Where to change what

| You want to change… | Edit |
|---|---|
| VAT, service charge, delivery fee | Dashboard → Settings (stored in the database, not code) |
| Who can perform an action | `src/config/permissions.ts` and the role group in the controller |
| A validation rule | The Zod schema in `src/validations/` — the form updates with it |
| A database query | The service file, never the controller |
| Rate limits | `RATE_RULES` in `src/lib/rateLimit.ts` |
| Business timezone | `RESTAURANT_TIMEZONE` in `.env` |
| Site domain for SEO | `NEXT_PUBLIC_SITE_URL` in `.env` |

---

## Deployment

Deployed on Vercel from the `main` branch. Before pushing:

```bash
npx tsc --noEmit      # must be 0 errors — the build enforces this too
npm run lint
npm run build
```

Set the same environment variables in the Vercel project settings. `robots.txt` and `sitemap.xml` are generated automatically; `/api`, `/dashboard`, `/account`, and `/checkout` are excluded from search engines.

---

## Notes for contributors

- Source comments are written in Bengali on purpose — they explain *why* a decision was made, which is the part that is hard to recover from the code later. Keep that style when adding to a file.
- Pages that matter for SEO (home, menu, food detail) are Server Components so that Google and social previews get real content in the first HTML response. Don't convert them to client-side fetching.
- The dashboard is client-rendered behind auth and is intentionally `noindex`.
