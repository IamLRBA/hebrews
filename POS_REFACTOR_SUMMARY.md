# POS-Only Structural Refactor Summary

This document describes the structural changes made to convert the repository into a POS-only application. **No business logic, state management, or lib code was modified.**

---

## 1. Routes Removed/Deactivated

The following routes were **removed** (files deleted) because they are not needed for a POS:

| Route | File(s) Removed | Reason |
|-------|-----------------|--------|
| **Home** | `app/page.tsx` | Replaced by POS landing at `/` via `app/(pos)/page.tsx` |
| **/about-us** | `app/about-us/page.tsx` | Marketing page; not needed for POS |
| **/privacy-policy** | `app/privacy-policy/page.tsx` | Marketing/legal; not needed for POS |
| **/terms-conditions** | `app/terms-conditions/page.tsx` | Marketing/legal; not needed for POS |
| **/sections/shop** | `app/sections/shop/page.tsx` | Public shop/menu browsing; not needed for POS |
| **/products/[category]** | `app/products/[category]/page.tsx` | Product category browsing; not needed for POS |

**Empty folders left in place:** `app/about-us/`, `app/privacy-policy/`, `app/terms-conditions/`, `app/sections/`, `app/sections/shop/`, `app/products/`, `app/products/[category]/` may still exist as empty directories. They do not define routes (no `page.tsx`). You can delete them manually if desired; they do not affect the build.

---

## 2. New POS Structure Created

### Route group: `app/(pos)/`

- **(pos)** is a Next.js **route group**: the parentheses mean it does not add a URL segment. So `app/(pos)/page.tsx` serves the **root path `/`**.

### Files created

| File | Purpose |
|------|--------|
| **app/(pos)/layout.tsx** | POS shell: full-screen, minimal wrapper. No Navbar/Footer (they are omitted for `/` by `ConditionalShell`). Tablet/desktop friendly. |
| **app/(pos)/page.tsx** | POS default landing: placeholder UI with text "POS Menu". This is what users see at `/`. |

### Conditional shell (for non-POS routes)

| File | Purpose |
|------|--------|
| **components/layout/ConditionalShell.tsx** | Client component that uses `usePathname()`. When pathname is `/`, it renders only `children` (no Navbar, Footer, or global UI). When pathname is anything else (e.g. `/cart`, `/checkout`, `/login`, `/admin/*`), it renders the full shell: SkipToContent, Navbar, main, Footer, AccountPromptPopup, BackToTop, KeyboardShortcuts. |

### Root layout change

- **app/layout.tsx** now wraps `children` in `<ConditionalShell>{children}</ConditionalShell>` instead of directly rendering Navbar, main, Footer, etc. So:
  - **`/`** → POS layout + POS page only (no Navbar/Footer).
  - **All other routes** → Full shell (Navbar, main, Footer, etc.) around the route’s page.

---

## 3. Link and Reference Updates

All links that pointed to removed routes were updated so they do not 404:

| Location | Change |
|----------|--------|
| **components/layout/Navbar.tsx** | Removed "About Us" from `navigation`. Set `portalItems` to single item "Menu" → `/`. Search result links: `href` changed from `/products/...` to `/`. |
| **components/PortalNavigation.tsx** | Portal href changed from `/sections/shop` to `/`. Title set to "ᗰEᑎᑌ". |
| **components/layout/Footer.tsx** | Privacy Policy and Terms & Conditions links removed; replaced with "POS" label. |
| **components/ui/KeyboardShortcuts.tsx** | Shortcut A: `/about-us` → `/`. Shortcut F: `/sections/shop` → `/`. |
| **app/cart/page.tsx** | All links to `/sections/shop` → `/`. |
| **app/checkout/page.tsx** | All links to `/products/shirts` → `/`. |
| **app/order-confirmation/page.tsx** | All links to `/products/barista` → `/`. |
| **app/account/page.tsx** | Link to `/sections/shop` → `/`. |
| **app/sitemap.ts** | Removed URLs for deleted routes. Sitemap now lists only: `/`, `/cart`, `/checkout`, `/login`, `/account`. |

---

## 4. Unused Components (Left in Place)

The following components are **no longer used** by any remaining page but were **left in place** as requested:

- **components/sections/CafeMenuSection.tsx** – Previously used by `/sections/shop`. Still contains links to `/products/...`; those routes are removed, but the file was not modified.
- **components/sections/FeaturedCollections.tsx** – Previously used by home. Still contains links to `/products/...`.
- **components/sections/AnimatedImageBanner.tsx** – Previously used by home.
- **components/sections/AnimatedImageBannerAboutUs.tsx** – Previously used by `/about-us`.
- **components/sections/AboutUs.tsx** – Previously used by `/about-us`.
- **components/PortalNavigation.tsx** – Still used by root layout only when pathname is not `/` (via ConditionalShell). Portal now points to `/`. If no page other than POS ever renders it, it could be considered unused in practice; it is still in the tree for non-POS routes.

Navbar and Footer remain in use for all non-POS routes (cart, checkout, login, account, admin).

---

## 5. Why These Changes Are Safe and Reversible

- **No business logic or lib code changed:** `lib/auth.ts`, `lib/cart.ts`, `lib/products.ts`, and all other lib/state code are unchanged. Cart, orders, auth, and products still behave the same.
- **Only routing and layout structure changed:** Removed page files, added a route group and conditional shell, and updated links/sitemap. No new APIs, middleware, or databases.
- **Reversible:** To restore the public website:
  1. Restore deleted `app/page.tsx`, `app/about-us/page.tsx`, etc. from version control.
  2. Revert `app/layout.tsx` to render Navbar/Footer directly (remove ConditionalShell).
  3. Remove or bypass `app/(pos)/` (e.g. delete `(pos)` or move POS to a different path).
  4. Revert link and sitemap changes in Navbar, Footer, PortalNavigation, KeyboardShortcuts, cart, checkout, order-confirmation, account, and sitemap.
- **Build:** The app compiles successfully; static generation runs for the remaining routes (e.g. 15 routes). No runtime errors were introduced by missing routes because all remaining links point to existing paths.

---

## 6. Routes That Remain

After the refactor, the app has:

| Route | Purpose |
|-------|--------|
| **/** | POS landing ("POS Menu") – no Navbar/Footer |
| **/cart** | Shopping cart |
| **/checkout** | Checkout |
| **/order-confirmation** | Order confirmation (query: `?orderId=...`) |
| **/login** | Customer login/signup |
| **/account** | Customer account |
| **/admin/login** | Admin login |
| **/admin/dashboard** | Admin dashboard |

API routes `/api/send-email` and `/api/send-whatsapp` are unchanged. `robots.ts` and `sitemap.ts` still apply; sitemap now only includes the routes above (excluding admin).
