# Workspace

## Overview

pnpm workspace monorepo using TypeScript. "Aruna Nighties" — Indian women's nightwear e-commerce store with public storefront and "Yagna Kunda" protected admin panel.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + Tailwind CSS (artifacts/web, served at /)
- **API framework**: Express 5 (artifacts/api-server, served at /api)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Object Storage**: Replit Object Storage (bucket provisioned; images stored at `/objects/uploads/<uuid>`)

## Features

- **Homepage** (`/`): Public storefront with hero, product grid, Navbar, WhatsApp FAB
- **Collections** (`/collections`): Browsable product collections
- **Products** (`/products/:id`): Product detail with swipeable multi-image gallery
- **Cart / Checkout**: Login-gated; OTP-based phone authentication
- **Admin Login** (`/admin/login`): OTP login for `9704761386` (demo OTP: `123456`)
- **Admin Dashboard — "Yagna Kunda"** (`/admin`): Tabs for Overview, Products (CRUD + multi-image upload), Collections (drag-and-drop reorder), Orders, Settings, Low Stock
- **Image upload**: Drag-and-drop, per-image progress, 3–10 images, 1MB min per file, auto-crop modal for non-3:4 images, stored in Object Storage

## Auth

- **Customer auth**: OTP phone login; state managed via `UserContext` (`context/user.tsx`), stored in `aruna_user` localStorage key
- **Admin auth**: OTP login for `9704761386`, demo OTP `123456`; HMAC-signed token stored as `adminToken` in localStorage

## Theme

Pink/white — primary `340 65% 48%` (rose/pink). Currency: ₹. Pricing: MRP = offer×1.45, Base = offer×1.20.

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm --filter @workspace/web run dev` — run frontend locally

## Database Schema

- `products`: id, name, description, price, mrp, basePrice, offerPrice, imageUrl, images (json array), stock, categoryId, sectionId, rating, reviewCount, reviewText, created_at, updated_at
- `categories`: id, name, slug
- `homepage_sections`: id, title, type, items (json), sort_order, active
- `site_settings`: key, value
- `orders`: id, customer_name, phone, total, status, items (json), created_at
- `users`: id, phone, name, created_at

## Important Notes

- **Express 5 wildcards**: Use `/{*splat}` syntax (not `/*`); access via `req.params.splat`
- **Backend imports**: Use `import { db, table } from "@workspace/db"` — NOT `"../lib/db"`
- **Storage routes** are in `artifacts/api-server/src/routes/storage.ts` (not in OpenAPI spec)
- **Image resolution**: Use `resolveImageUrl()` from `components/product-gallery.tsx` to convert `/objects/...` paths to full API URLs
- **dnd-kit hooks**: `useSensors` must be called at top of component to avoid hook-order violations
- **Tab types**: `"overview" | "products" | "sections" | "orders" | "collections" | "settings" | "lowstock"`

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
