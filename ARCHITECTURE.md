# Aruna Nighties — E-Commerce Platform Architecture

## Project Overview

**Aruna Nighties** is a premium e-commerce platform specializing in traditional Indian cotton nightgowns. The application features a modern, responsive design with a complete product catalog, shopping cart, order management, and integrated payment processing. The platform supports both customer and admin functionality, with real-time inventory management and multiple shipping integrations.

**Core Purpose:** Provide a seamless shopping experience for customers to browse, purchase, and track traditional Indian nightgowns while offering administrative tools for inventory and order management.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **UI Library:** React with TypeScript
- **Styling:** Tailwind CSS 4.0 with PostCSS
- **Component System:** Radix UI (comprehensive primitive components)
- **State Management:** React Context API + React Query
- **Forms:** React Hook Form with Zod validation
- **Animations:** Framer Motion, Embla Carousel
- **Icons:** Lucide React, React Icons

### Backend
- **Server:** Next.js Route Handlers (serverless functions)
- **ORM:** Drizzle ORM
- **Database:** MySQL 2
- **Authentication:** Firebase Authentication (phone verification)
- **Payment Processing:** Razorpay API
- **File Storage:** Google Cloud Storage
- **Logging:** Pino

### Development Tools
- **Language:** TypeScript ~5.9.2
- **Package Manager:** pnpm (monorepo)
- **Database Migrations:** Drizzle Kit
- **Code Formatting:** Prettier
- **Build Tools:** Vite (frontend build support)

### Key Integrations
- **Payment Gateway:** Razorpay (orders, payments, signatures)
- **Shipping Provider:** Xpressbees (courier integration, AWB generation)
- **Cloud Storage:** Google Cloud Storage (product images, user uploads)
- **Authentication:** Firebase Admin SDK + Web SDK

---

## Directory Structure

```
arunanighties_nxt/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API Route Handlers
│   │   │   ├── admin/               # Admin operations
│   │   │   │   ├── reports/
│   │   │   │   └── [endpoints]
│   │   │   ├── auth/                # Authentication endpoints
│   │   │   │   ├── admin-logout/
│   │   │   │   ├── admin-me/
│   │   │   │   └── verify-firebase-phone/
│   │   │   ├── categories/          # Product categories CRUD
│   │   │   ├── healthz/             # Health check endpoint
│   │   │   ├── homepage-sections/   # Homepage content management
│   │   │   ├── orders/              # Order management
│   │   │   │   ├── route.ts (GET/POST)
│   │   │   │   ├── my/              # User's orders
│   │   │   │   └── [id]/            # Order details
│   │   │   ├── payments/            # Razorpay integration
│   │   │   │   ├── create-order/    # Create Razorpay order
│   │   │   │   └── verify/          # Verify payment signature
│   │   │   ├── products/            # Product catalog
│   │   │   │   ├── route.ts (GET/POST)
│   │   │   │   ├── [id]/            # Product details
│   │   │   │   └── check-stock/     # Stock verification
│   │   │   ├── reviews/             # Product reviews
│   │   │   │   └── [id]/            # Review operations
│   │   │   ├── settings/            # Application settings
│   │   │   ├── shipping/            # Shipping integrations
│   │   │   │   └── couriers/        # Courier management
│   │   │   ├── stats/               # Analytics & statistics
│   │   │   ├── storage/             # File uploads to Cloud Storage
│   │   │   └── users/               # User profiles
│   │   │       └── [id]/
│   │   ├── layout.tsx               # Root layout with metadata & Razorpay script
│   │   └── [[...slug]]/             # Catch-all routes for SPA-like routing
│   │       └── page.tsx
│   ├── components/                   # React components
│   │   ├── admin/                   # Admin dashboard components
│   │   ├── auth/                    # Authentication UI
│   │   ├── layout/                  # Layout components (navigation, footer)
│   │   ├── orders/                  # Order-related UI
│   │   ├── product-card.tsx         # Product card component
│   │   ├── product-carousel.tsx     # Carousel for featured products
│   │   ├── product-gallery.tsx      # Product image gallery
│   │   ├── reviews-section.tsx      # Reviews display
│   │   ├── ClientWrapper.tsx        # Client-side context wrapper
│   │   ├── login-modal.tsx          # Login dialog
│   │   └── ui/                      # Radix UI based primitive components
│   ├── db/                           # Database utilities
│   │   ├── index.ts                 # Drizzle ORM initialization, exports
│   │   └── [schema exports]         # Re-exports from lib/db
│   ├── lib/                          # Utility functions & services
│   │   ├── adminAuth.ts             # Admin authorization middleware
│   │   ├── api-config.ts            # API configuration
│   │   ├── firebaseAdmin.ts         # Firebase Admin SDK setup
│   │   ├── razorpay.ts              # Razorpay client initialization
│   │   ├── serverLogger.ts          # Pino logger configuration
│   │   ├── objectStorage.ts         # Google Cloud Storage utilities
│   │   ├── orderHelpers.ts          # Order processing utilities
│   │   ├── utils.ts                 # Common utility functions
│   │   └── objectAcl.ts             # ACL for storage objects
│   ├── hooks/                        # Custom React hooks
│   ├── services/                     # Business logic services
│   ├── context/                      # React Context providers
│   ├── config/                       # Configuration files
│   ├── utils/                        # Frontend utilities
│   ├── client-pages/                 # Client-side page logic
│   ├── App.tsx                       # Main App component
│   ├── main.tsx                      # React entry point
│   ├── index.css                     # Global styles
│   └── vite-env.d.ts                # Vite environment types
├── lib/                              # Monorepo packages
│   ├── db/                          # Shared database layer
│   │   ├── src/
│   │   │   ├── schema/              # Drizzle ORM schemas
│   │   │   │   ├── index.ts
│   │   │   │   ├── users.ts         # Users table & types
│   │   │   │   ├── products.ts      # Products table with inventory
│   │   │   │   ├── orders.ts        # Orders with payment/shipping data
│   │   │   │   ├── categories.ts    # Product categories
│   │   │   │   ├── reviews.ts       # Product reviews
│   │   │   │   ├── settings.ts      # App settings
│   │   │   │   └── homepage-sections.ts # Homepage content
│   │   │   └── index.ts             # Database connection & exports
│   │   ├── drizzle.config.cjs
│   │   ├── drizzle/                 # Migration files
│   │   └── package.json
│   ├── api-spec/                    # OpenAPI specification
│   │   ├── openapi.yaml
│   │   ├── orval.config.ts
│   │   └── package.json
│   ├── api-client-react/            # Generated API client
│   │   ├── src/
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── api-zod/                     # Zod validation schemas
│       ├── src/
│       ├── tsconfig.json
│       └── package.json
├── scripts/                          # Utility scripts
│   ├── db-push.mjs
│   ├── seed.mjs
│   ├── deploy.mjs
│   ├── debug-db.mjs
│   └── src/
├── deployment/                       # Deployment configuration
│   ├── Procfile
│   ├── pino-file.mjs
│   ├── pino-pretty.mjs
│   ├── pino-worker.mjs
│   └── thread-stream-worker.mjs
├── data/                             # Local database backups
│   ├── pglite/                      # PostgreLite database
│   ├── pglite_backup_999/
│   └── pglite_bak/
├── drizzle/                          # Migration history
│   ├── 0000_overconfident_lord_tyger.sql
│   ├── 0001_long_hex.sql
│   └── meta/
├── ARUNA_NIGHTIES/                   # Documentation/assets folder
│   └── README.md
├── package.json                      # Workspace root dependencies
├── pnpm-workspace.yaml               # pnpm monorepo configuration
├── tsconfig.base.json                # Base TypeScript configuration
├── tsconfig.json                     # App TypeScript configuration
├── next.config.js                    # Next.js configuration
├── postcss.config.mjs                # PostCSS configuration
├── drizzle.config.ts                 # Drizzle ORM configuration
└── README.md
```

---

## Frontend Routing

The application uses Next.js App Router with a catch-all route (`[[...slug]]/`) that enables SPA-like routing for dynamic page navigation. The actual routing is handled client-side by the `page.tsx` component within this catch-all route.

| Route | Purpose | Component |
|-------|---------|-----------|
| `/` | Homepage / Landing page | SPA route via `[[...slug]]/page.tsx` |
| `/products` | Product catalog / Browse | Dynamic SPA route |
| `/product/[id]` | Product detail view | Dynamic SPA route with product details, reviews, gallery |
| `/cart` | Shopping cart | Dynamic SPA route with items management |
| `/checkout` | Payment checkout | Dynamic SPA route with Razorpay integration |
| `/orders` | Order history | Dynamic SPA route showing user's orders |
| `/orders/[id]` | Order detail & tracking | Dynamic SPA route with shipping info |
| `/account` | User profile & settings | Dynamic SPA route with address management |
| `/admin` | Admin dashboard | Admin-only access via Firebase auth + custom middleware |
| `/admin/products` | Product management | Admin CRUD operations |
| `/admin/orders` | Order management | Admin view with fulfillment controls |
| `/admin/reports` | Analytics & reports | Admin analytics dashboard |

**Routing Architecture:** All user-facing routes are handled via the catch-all `[[...slug]]/` route, which passes the slug to the frontend React application for client-side routing using Wouter or similar routing library.

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|----------------|
| POST | `/api/auth/verify-firebase-phone` | Verify phone number with Firebase token | No |
| POST | `/api/auth/admin-me` | Get current admin user info | Yes (Admin) |
| POST | `/api/auth/admin-logout` | Logout admin session | Yes (Admin) |

### Product Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|----------------|
| GET | `/api/products` | Fetch all products with inventory | No |
| POST | `/api/products` | Create new product | Yes (Admin) |
| GET | `/api/products/[id]` | Fetch single product details | No |
| PUT | `/api/products/[id]` | Update product | Yes (Admin) |
| DELETE | `/api/products/[id]` | Delete product | Yes (Admin) |
| POST | `/api/products/check-stock` | Check stock availability | No |

### Category Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|----------------|
| GET | `/api/categories` | Fetch all categories | No |
| POST | `/api/categories` | Create category | Yes (Admin) |
| GET | `/api/categories/[id]` | Fetch category details | No |
| PUT | `/api/categories/[id]` | Update category | Yes (Admin) |
| DELETE | `/api/categories/[id]` | Delete category | Yes (Admin) |

### Order Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|----------------|
| GET | `/api/orders` | Get all orders (admin) | Yes (Admin) |
| POST | `/api/orders` | Create new order | No (can use guest) |
| GET | `/api/orders/my` | Get user's orders | Yes (User) |
| GET | `/api/orders/[id]` | Get order details & status | User/Admin |
| PUT | `/api/orders/[id]` | Update order status | Yes (Admin) |
| DELETE | `/api/orders/[id]` | Cancel order | User/Admin |

### Payment Endpoints (Razorpay Integration)

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|----------------|
| POST | `/api/payments/create-order` | Create Razorpay order for checkout | No |
| POST | `/api/payments/verify` | Verify Razorpay payment signature | No |

### Review Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|----------------|
| GET | `/api/reviews/[productId]` | Fetch product reviews | No |
| POST | `/api/reviews` | Submit product review | Yes (User) |
| PUT | `/api/reviews/[id]` | Update review | Yes (Owner) |
| DELETE | `/api/reviews/[id]` | Delete review | Yes (Owner) |

### Shipping Endpoints (Xpressbees Integration)

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|----------------|
| GET | `/api/shipping/couriers` | Get available courier options | No |
| POST | `/api/shipping/generate-awb` | Generate AWB for shipment | Yes (Admin) |
| PUT | `/api/shipping/[orderId]` | Update shipping status | Yes (Admin) |
| GET | `/api/shipping/[awbNumber]` | Track shipment status | No |

### User Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|----------------|
| GET | `/api/users/[id]` | Get user profile | User/Admin |
| PUT | `/api/users/[id]` | Update user profile | User |
| PUT | `/api/users/[id]/addresses` | Manage user addresses | User |

### Admin Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|----------------|
| GET | `/api/admin/reports` | Get analytics & reports | Yes (Admin) |
| GET | `/api/admin/dashboard` | Get dashboard summary | Yes (Admin) |
| POST | `/api/admin/[resource]/bulk` | Bulk operations | Yes (Admin) |

### Utility Endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|----------------|
| GET | `/api/healthz` | Health check | No |
| GET | `/api/settings` | Get app settings | No |
| POST | `/api/settings` | Update app settings | Yes (Admin) |
| POST | `/api/homepage-sections` | Manage homepage content | Yes (Admin) |
| POST | `/api/storage/upload` | Upload file to Cloud Storage | Yes (Auth) |
| POST | `/api/stats` | Get usage statistics | Yes (Admin) |

---

## Database Schema

### Users Table (`users`)
Stores customer and admin user information with authentication details.

```
┌─────────────────────────────────────────────┐
│ users                                       │
├─────────────────────────────────────────────┤
│ id (INT, PK, Auto-increment)               │
│ phone (VARCHAR 20, UNIQUE, NOT NULL)       │
│ name (VARCHAR 255)                         │
│ email (VARCHAR 255, UNIQUE)                │
│ addresses (TEXT, JSON)                     │
│ createdAt (TIMESTAMP, DEFAULT NOW)         │
└─────────────────────────────────────────────┘
```

**Relationships:** Referenced by Orders, Reviews, and Admin sessions.

---

### Products Table (`products`)
Stores product catalog with inventory, pricing, and media.

```
┌──────────────────────────────────────────────────────────┐
│ products                                                 │
├──────────────────────────────────────────────────────────┤
│ id (INT, PK, Auto-increment)                            │
│ name (VARCHAR 255, NOT NULL)                            │
│ description (TEXT, NOT NULL)                            │
│ imageUrl (TEXT, NOT NULL)                               │
│ stock (INT, DEFAULT 0)                                  │
│ categoryId (INT, FK → categories)                       │
│ sectionId (INT, FK → homepage_sections)                │
│ rating (DECIMAL 3,1, DEFAULT 4.3)                       │
│ reviewCount (INT, DEFAULT 1)                            │
│ reviewText (TEXT)                                       │
│ images (JSON, Array<string>)                            │
│ sizes (JSON, Array<{size, quantity}>)                   │
│ inventory (JSON, Map<size → Map<color → {hex, qty, price, mrp}>>)   │
│ createdAt (TIMESTAMP, DEFAULT NOW)                      │
│ updatedAt (TIMESTAMP, DEFAULT NOW, ON UPDATE NOW)      │
└──────────────────────────────────────────────────────────┘
```

**Key Features:**
- `inventory` field stores color-wise pricing and stock with size/color variants
- `sizes` tracks size availability with quantity
- Supports multiple images and product gallery
- Automatic timestamp management

**Relationships:** Referenced by Orders, Reviews, and Home Sections.

---

### Orders Table (`orders`)
Stores order and payment information with Razorpay & shipping integration.

```
┌────────────────────────────────────────────────────────────┐
│ orders                                                     │
├────────────────────────────────────────────────────────────┤
│ id (INT, PK, Auto-increment)                             │
│ userId (INT, FK → users, NULLABLE)                       │
│ customerName (VARCHAR 255, NOT NULL)                     │
│ email (VARCHAR 255, NOT NULL)                            │
│ phone (VARCHAR 20)                                       │
│ items (TEXT, JSON)                                       │
│ address (TEXT)                                           │
│ total (DECIMAL 10,2, NOT NULL)                           │
│ status (VARCHAR 50, DEFAULT 'pending')                   │
│ razorpayOrderId (VARCHAR 255)                            │
│ razorpayPaymentId (VARCHAR 255)                          │
│ razorpaySignature (VARCHAR 255)                          │
│ paymentStatus (VARCHAR 50, DEFAULT 'pending')            │
│ awbNumber (VARCHAR 50)                                   │
│ shippingDetails (JSON)                                   │
│ createdAt (TIMESTAMP, DEFAULT NOW)                       │
└────────────────────────────────────────────────────────────┘
```

**Order Status Flow:** `pending` → `confirmed` → `processing` → `shipped` → `delivered`

**Payment Status Flow:** `pending` → `completed` / `failed`

**Relationships:** References Users, Products (via items JSON); referenced by Shipping records.

---

### Categories Table (`categories`)
Product category organization for filtering and navigation.

```
┌─────────────────────────────────────────────┐
│ categories                                  │
├─────────────────────────────────────────────┤
│ id (INT, PK, Auto-increment)               │
│ name (VARCHAR 255, UNIQUE, NOT NULL)       │
│ description (TEXT, NOT NULL)                │
│ icon (VARCHAR 255, DEFAULT '🌸')           │
│ createdAt (TIMESTAMP, DEFAULT NOW)         │
└─────────────────────────────────────────────┘
```

**Usage:** Referenced by Products for categorization.

---

### Reviews Table (`reviews`)
Product reviews and ratings from customers.

```
┌──────────────────────────────────────────────────────┐
│ reviews                                              │
├──────────────────────────────────────────────────────┤
│ id (INT, PK, Auto-increment)                        │
│ productId (INT, NOT NULL, FK → products)            │
│ userId (INT, NULLABLE, FK → users)                  │
│ userName (VARCHAR 255, DEFAULT 'Anonymous')         │
│ rating (INT, DEFAULT 5)                             │
│ title (VARCHAR 255, NOT NULL)                       │
│ comment (TEXT, NOT NULL)                            │
│ imageUrls (JSON, Array<string>)                     │
│ helpfulCount (INT, DEFAULT 0)                       │
│ createdAt (TIMESTAMP, DEFAULT NOW)                  │
└──────────────────────────────────────────────────────┘
```

**Relationships:** References Products and Users.

---

### Homepage Sections Table (`homepage_sections`)
Dynamic content management for homepage banners, featured products, etc.

```
┌───────────────────────────────────────────────────┐
│ homepage_sections                                 │
├───────────────────────────────────────────────────┤
│ id (INT, PK, Auto-increment)                     │
│ title (VARCHAR 255, NOT NULL)                    │
│ sectionType (VARCHAR 50, NOT NULL)               │
│ content (JSON)                                   │
│ displayOrder (INT)                               │
│ isActive (BOOLEAN, DEFAULT true)                 │
│ createdAt (TIMESTAMP, DEFAULT NOW)               │
│ updatedAt (TIMESTAMP, ON UPDATE NOW)             │
└───────────────────────────────────────────────────┘
```

**Section Types:** banner, featured-products, testimonials, promotions, etc.

---

### Settings Table (`settings`)
Global application configuration (site name, contact, payment keys, etc.).

```
┌────────────────────────────────────┐
│ settings                           │
├────────────────────────────────────┤
│ id (INT, PK, Auto-increment)      │
│ key (VARCHAR 255, UNIQUE)          │
│ value (TEXT)                       │
│ createdAt (TIMESTAMP)              │
│ updatedAt (TIMESTAMP)              │
└────────────────────────────────────┘
```

**Common Keys:** site_name, support_email, phone, razorpay_key_id, etc.

---

## Key Features & Integrations

### 1. **Product Management**
- Multi-image galleries with cloud storage
- Size and color variants with inventory tracking
- Dynamic pricing per variant (MRP vs Selling Price)
- Product ratings and customer reviews
- Category-based filtering

### 2. **Shopping & Checkout**
- Shopping cart with session/local storage
- Stock validation before purchase
- Guest checkout support
- Razorpay payment gateway integration
- Order confirmation with details

### 3. **Order Management**
- Real-time order status tracking
- Order history with filtering
- Admin order dashboard with bulk operations
- Automatic stock decrement on purchase
- Order cancellation support

### 4. **Payment Processing (Razorpay)**
- Create Razorpay orders with INR currency
- Payment verification with signature validation
- Support for multiple payment methods (cards, UPI, wallets)
- Payment status tracking in database

### 5. **Shipping Integration (Xpressbees)**
- AWB (Air Waybill) generation for shipments
- Multiple courier options selection
- Real-time shipping status updates
- Tracking information in user orders

### 6. **Authentication & Authorization**
- Firebase phone authentication
- Admin role-based access control
- Session management with custom middleware
- User profile management with addresses

### 7. **Admin Dashboard**
- Product CRUD operations
- Order management & fulfillment
- Category management
- Analytics & sales reports
- Homepage content customization

### 8. **File Storage**
- Google Cloud Storage integration
- Product image uploads
- User-generated content (reviews with images)
- ACL management for objects

---

## Database Connection & ORM

**ORM Framework:** Drizzle ORM with MySQL 2 driver

**Connection Strategy:**
- Connection pooling via mysql2 to prevent blocking
- Proxy wrapper for error logging on queries
- Environment variable: `DATABASE_URL` (required)
- Workaround for MariaDB prepared statement issues on Hostinger

**Migration Management:**
- Drizzle Kit for generating migrations
- Migrations stored in `drizzle/` folder
- Schema snapshots tracked in `drizzle/meta/`

---

## Monorepo Structure

The project uses **pnpm workspaces** for organizing shared packages:

- **@workspace/db:** Shared database layer with Drizzle schemas and connection
- **@workspace/api-spec:** OpenAPI specification with Orval code generation
- **@workspace/api-client-react:** Generated TypeScript API client
- **@workspace/api-zod:** Zod validation schemas for API requests/responses

---

## Development Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run typecheck` | Run TypeScript type checking |

---

## Key Utilities & Services

### Authentication & Authorization
- **adminAuth.ts:** Middleware for verifying admin requests
- **firebaseAdmin.ts:** Firebase Admin SDK initialization
- **serverLogger.ts:** Structured logging with Pino

### External Services
- **razorpay.ts:** Razorpay client initialization for payment processing
- **objectStorage.ts:** Google Cloud Storage utilities for file uploads
- **objectAcl.ts:** ACL management for storage objects

### Business Logic
- **orderHelpers.ts:** Order creation, stock decrement, and processing utilities
- **utils.ts:** Common utility functions (validation, formatting, etc.)

---

## Performance & Optimization

- **Component Code Splitting:** Lazy loading of admin components
- **Image Optimization:** Cloud Storage for product images
- **Database Connection Pooling:** Prevents connection exhaustion
- **React Query:** Client-side data caching and synchronization
- **Tailwind CSS:** CSS-in-JS for optimized bundle size

---

## Security Measures

1. **Admin Authorization:** Custom middleware on protected API routes
2. **Firebase Authentication:** Secure phone verification
3. **Razorpay Signature Verification:** Payment authenticity validation
4. **Environment Variables:** Sensitive data (API keys) not hardcoded
5. **Error Logging:** Structured error tracking without exposing sensitive details

---

## Future Enhancements

- Wishlist feature for product saving
- Advanced filtering (price range, ratings, size availability)
- Promotional codes and discount management
- Email notifications for order updates
- SMS notifications via SMS gateway
- Customer support chat integration
- Analytics dashboard with detailed insights
- Inventory forecasting and automation

---

**Last Updated:** May 2026
**Version:** 1.0
**Project:** Aruna Nighties E-Commerce Platform
