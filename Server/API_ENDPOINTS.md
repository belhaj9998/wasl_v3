# Wasl SaaS — API Endpoints Reference

Base URL: `http://localhost:6200`

---

## 🏥 Health Check

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | ❌ | Database connectivity check |

---

## 🔐 Auth (`/api/auth`)

### Public (no auth required)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | `{ name, email, phone, password }` | Register new user |
| POST | `/api/auth/login` | `{ identifier, password }` | Login (email or phone). Returns accessToken + sets refresh cookie |
| POST | `/api/auth/forgot-password` | `{ email }` | Send password reset email |
| POST | `/api/auth/reset-password` | `{ token, password }` | Reset password with token |
| POST | `/api/auth/refresh` | — | Refresh access token (uses httpOnly cookie) |

### Protected (Bearer token required)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/logout` | — | Logout (clears refresh cookie) |
| GET | `/api/auth/me` | — | Get current user profile |
| PATCH | `/api/auth/me` | `{ name?, phone? }` | Update profile |
| POST | `/api/auth/change-password` | `{ currentPassword, newPassword }` | Change password |
| POST | `/api/auth/stores` | `{ name, domain }` | Create a new store (domain: lowercase, hyphens only) |

---

## 🏢 Platform Admin (`/api/platform`)

> All routes require: `Authorization: Bearer <token>` from PLATFORM_ADMIN or PLATFORM_OWNER user

### Users

| Method | Endpoint | Query/Body | Description |
|--------|----------|------------|-------------|
| GET | `/api/platform/users` | `?page=1&limit=10&search=` | List users (paginated) |
| GET | `/api/platform/users/:id` | — | Get user by ID |
| PATCH | `/api/platform/users/:id` | `{ name?, is_active?, system_role? }` | Update user |
| DELETE | `/api/platform/users/:id` | — | Soft-delete user |

### Stores

| Method | Endpoint | Query/Body | Description |
|--------|----------|------------|-------------|
| GET | `/api/platform/stores` | `?page=1&limit=10&search=` | List all stores |
| GET | `/api/platform/stores/:id` | — | Get store by ID |
| PATCH | `/api/platform/stores/:id/status` | `{ status }` | Update store status (ACTIVE/SUSPENDED/ARCHIVED) |
| DELETE | `/api/platform/stores/:id` | — | Soft-delete store |

### Subscription Plans

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/platform/plans` | — | List all plans |
| POST | `/api/platform/plans` | `{ name, code, price_monthly, price_yearly, max_stores, max_products, max_staff }` | Create plan |
| GET | `/api/platform/plans/:id` | — | Get plan by ID |
| PATCH | `/api/platform/plans/:id` | `{ ...fields }` | Update plan |
| DELETE | `/api/platform/plans/:id` | — | Delete plan |

### Subscriptions

| Method | Endpoint | Query/Body | Description |
|--------|----------|------------|-------------|
| GET | `/api/platform/subscriptions` | `?page=1&limit=10` | List subscriptions |
| GET | `/api/platform/subscriptions/:id` | — | Get subscription by ID |
| PATCH | `/api/platform/subscriptions/:id` | `{ status?, plan_id? }` | Update subscription |

### Permissions

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/platform/permissions` | — | List all permissions |
| POST | `/api/platform/permissions` | `{ code, module, action, description }` | Create permission |
| PATCH | `/api/platform/permissions/:id` | `{ ...fields }` | Update permission |
| DELETE | `/api/platform/permissions/:id` | — | Delete permission |

### Dashboard

| Method | Endpoint | Query | Description |
|--------|----------|-------|-------------|
| GET | `/api/platform/dashboard/stats` | — | Platform-wide statistics |
| GET | `/api/platform/dashboard/revenue` | — | Aggregated revenue data |
| GET | `/api/platform/dashboard/growth` | `?months=6` | Store growth metrics |

---

## 🏪 Store Admin (`/api/stores/:storeId`)

> All routes require: `Authorization: Bearer <token>` + user must have membership in the store with appropriate permissions

### Settings

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/stores/:storeId/settings` | — | Get store settings |
| PATCH | `/api/stores/:storeId/settings/general` | `{ name?, domain?, description? }` | Update general settings |
| PATCH | `/api/stores/:storeId/settings/branding` | `{ logo_url?, favicon_url?, primary_color? }` | Update branding |
| PATCH | `/api/stores/:storeId/settings/seo` | `{ meta_title?, meta_description? }` | Update SEO |
| PATCH | `/api/stores/:storeId/settings/contact` | `{ support_email?, support_phone? }` | Update contact info |

### Members

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/stores/:storeId/members` | `?page=1&limit=10` | List store members |
| POST | `/api/stores/:storeId/members/invite` | `{ email, role_id }` | Invite member |
| GET | `/api/stores/:storeId/members/:memberId` | — | Get member details |
| PATCH | `/api/stores/:storeId/members/:memberId/role` | `{ role_id }` | Update member role |
| DELETE | `/api/stores/:storeId/members/:memberId` | — | Remove member |
| POST | `/api/stores/:storeId/members/:memberId/resend-invite` | — | Resend invitation |

### Roles

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/stores/:storeId/roles` | — | List store roles |
| POST | `/api/stores/:storeId/roles` | `{ name, slug, description? }` | Create role |
| GET | `/api/stores/:storeId/roles/:roleId` | — | Get role details |
| PATCH | `/api/stores/:storeId/roles/:roleId` | `{ name?, description? }` | Update role |
| DELETE | `/api/stores/:storeId/roles/:roleId` | — | Delete role |
| PUT | `/api/stores/:storeId/roles/:roleId/permissions` | `{ permissions: ["code1", "code2"] }` | Replace role permissions |

---

## 📦 Catalog (`/api/stores/:storeId`)

### Categories

| Method | Endpoint | Query/Body | Description |
|--------|----------|------------|-------------|
| GET | `/api/stores/:storeId/categories` | `?format=tree&is_active=true` | List categories |
| POST | `/api/stores/:storeId/categories` | `{ name, slug, parent_id?, sort_order? }` | Create category |
| PATCH | `/api/stores/:storeId/categories/reorder` | `{ items: [{id, sort_order}] }` | Reorder categories |
| GET | `/api/stores/:storeId/categories/:id` | — | Get category |
| PATCH | `/api/stores/:storeId/categories/:id` | `{ name?, slug?, is_active? }` | Update category |
| DELETE | `/api/stores/:storeId/categories/:id` | — | Delete category |

### Products

| Method | Endpoint | Query/Body | Description |
|--------|----------|------------|-------------|
| GET | `/api/stores/:storeId/products` | `?page=1&limit=10&status=ACTIVE&category_id=` | List products |
| POST | `/api/stores/:storeId/products` | `{ name, slug, base_price, ... }` | Create product |
| GET | `/api/stores/:storeId/products/:id` | — | Get product |
| PATCH | `/api/stores/:storeId/products/:id` | `{ name?, base_price?, ... }` | Update product |
| DELETE | `/api/stores/:storeId/products/:id` | — | Delete product |
| PATCH | `/api/stores/:storeId/products/:id/status` | `{ status }` | Update status (ACTIVE/DRAFT/ARCHIVED) |
| POST | `/api/stores/:storeId/products/:id/publish` | `{ is_published }` | Publish/unpublish |
| POST | `/api/stores/:storeId/products/:id/duplicate` | — | Duplicate product |

### Product Options

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/stores/:storeId/products/:productId/options` | — | List options |
| POST | `/api/stores/:storeId/products/:productId/options` | `{ name, values: [] }` | Create option |
| PATCH | `/api/stores/:storeId/products/:productId/options/:optionId` | `{ name? }` | Update option |
| DELETE | `/api/stores/:storeId/products/:productId/options/:optionId` | — | Delete option |

### Option Values

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/stores/:storeId/products/:productId/options/:optionId/values` | `{ value }` | Add value |
| PATCH | `/api/stores/:storeId/products/:productId/options/:optionId/values/:valueId` | `{ value }` | Update value |
| DELETE | `/api/stores/:storeId/products/:productId/options/:optionId/values/:valueId` | — | Delete value |

### Variants

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/stores/:storeId/products/:productId/variants` | — | List variants |
| POST | `/api/stores/:storeId/products/:productId/variants` | `{ title, sku, price, ... }` | Create variant |
| POST | `/api/stores/:storeId/products/:productId/variants/generate` | — | Auto-generate from options |
| GET | `/api/stores/:storeId/variants/:variantId` | — | Get variant |
| PATCH | `/api/stores/:storeId/variants/:variantId` | `{ title?, price?, sku? }` | Update variant |
| DELETE | `/api/stores/:storeId/variants/:variantId` | — | Delete variant |
| PATCH | `/api/stores/:storeId/variants/:variantId/set-default` | — | Set as default |

### Inventory

| Method | Endpoint | Query/Body | Description |
|--------|----------|------------|-------------|
| GET | `/api/stores/:storeId/inventory` | `?page=1&limit=10` | List inventory |
| GET | `/api/stores/:storeId/inventory/low-stock` | — | Low-stock items |
| GET | `/api/stores/:storeId/inventory/movements` | `?page=1&limit=10` | All movements |
| GET | `/api/stores/:storeId/inventory/:variantId` | — | Get variant inventory |
| POST | `/api/stores/:storeId/inventory/:variantId/adjust` | `{ quantity, reason, type }` | Adjust stock |
| GET | `/api/stores/:storeId/inventory/:variantId/movements` | — | Variant movements |

### Product Media

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/stores/:storeId/products/:productId/media` | `multipart/form-data: file` | Upload image |
| PATCH | `/api/stores/:storeId/products/:productId/media/reorder` | `{ items: [{id, sort_order}] }` | Reorder media |
| PATCH | `/api/stores/:storeId/products/:productId/media/:id` | `{ alt_text }` | Update alt text |
| DELETE | `/api/stores/:storeId/products/:productId/media/:id` | — | Delete media |

---

## 🛒 Orders & Customers (`/api/stores/:storeId`)

### Customers

| Method | Endpoint | Query/Body | Description |
|--------|----------|------------|-------------|
| GET | `/api/stores/:storeId/customers` | `?page=1&limit=10&search=` | List customers |
| POST | `/api/stores/:storeId/customers` | `{ first_name, last_name, email, phone, password }` | Create customer |
| GET | `/api/stores/:storeId/customers/:customerId` | — | Get customer |
| PATCH | `/api/stores/:storeId/customers/:customerId` | `{ first_name?, last_name?, ... }` | Update customer |
| DELETE | `/api/stores/:storeId/customers/:customerId` | — | Soft-delete customer |
| GET | `/api/stores/:storeId/customers/:customerId/orders` | — | Customer order history |
| GET | `/api/stores/:storeId/customers/:customerId/addresses` | — | List addresses |
| POST | `/api/stores/:storeId/customers/:customerId/addresses` | `{ full_name, phone, city, street_line_1, ... }` | Create address |
| PATCH | `/api/stores/:storeId/customers/:customerId/addresses/:addressId` | `{ ...fields }` | Update address |
| DELETE | `/api/stores/:storeId/customers/:customerId/addresses/:addressId` | — | Delete address |
| PATCH | `/api/stores/:storeId/customers/:customerId/addresses/:addressId/set-default` | — | Set default |

### Coupons

| Method | Endpoint | Query/Body | Description |
|--------|----------|------------|-------------|
| GET | `/api/stores/:storeId/coupons` | `?page=1&limit=10&is_active=true` | List coupons |
| POST | `/api/stores/:storeId/coupons` | `{ code, type, value, ... }` | Create coupon |
| POST | `/api/stores/:storeId/coupons/validate` | `{ code, order_amount }` | Validate coupon |
| GET | `/api/stores/:storeId/coupons/:couponId` | — | Get coupon |
| PATCH | `/api/stores/:storeId/coupons/:couponId` | `{ ...fields }` | Update coupon |
| DELETE | `/api/stores/:storeId/coupons/:couponId` | — | Delete coupon |
| GET | `/api/stores/:storeId/coupons/:couponId/usages` | — | Usage history |

### Orders

| Method | Endpoint | Query/Body | Description |
|--------|----------|------------|-------------|
| GET | `/api/stores/:storeId/orders` | `?page=1&limit=10&status=PENDING` | List orders |
| POST | `/api/stores/:storeId/orders` | `{ customer_id, items: [...], ... }` | Create order |
| GET | `/api/stores/:storeId/orders/:orderId` | — | Get order |
| PATCH | `/api/stores/:storeId/orders/:orderId/status` | `{ status, note? }` | Update status |
| POST | `/api/stores/:storeId/orders/:orderId/cancel` | — | Cancel order |
| POST | `/api/stores/:storeId/orders/:orderId/notes` | `{ content, is_internal? }` | Add note |
| GET | `/api/stores/:storeId/orders/:orderId/timeline` | — | Order timeline |

### Shipments

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/stores/:storeId/orders/:orderId/shipments` | — | List shipments |
| POST | `/api/stores/:storeId/orders/:orderId/shipments` | `{ carrier, tracking_number, items }` | Create shipment |
| GET | `/api/stores/:storeId/shipments/:shipmentId` | — | Get shipment |
| PATCH | `/api/stores/:storeId/shipments/:shipmentId` | `{ carrier?, tracking_number? }` | Update shipment |
| PATCH | `/api/stores/:storeId/shipments/:shipmentId/status` | `{ status }` | Update status |

### Payments

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/stores/:storeId/orders/:orderId/payments` | — | List payments |
| POST | `/api/stores/:storeId/orders/:orderId/payments` | `{ amount, method, reference? }` | Record payment |
| POST | `/api/stores/:storeId/orders/:orderId/refunds` | `{ amount, reason? }` | Process refund |

### Store Dashboard

| Method | Endpoint | Query | Description |
|--------|----------|-------|-------------|
| GET | `/api/stores/:storeId/dashboard/overview` | — | Dashboard overview stats |
| GET | `/api/stores/:storeId/dashboard/sales-stats` | `?period=7d` | Sales statistics |
| GET | `/api/stores/:storeId/dashboard/inventory-alerts` | `?page=1&limit=10` | Low-stock alerts |

---

## 🛍️ Storefront (`/api/storefront`)

> Public routes use store domain (e.g., `elegance-store`). Customer auth uses separate JWT.

### Store Info (public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/storefront/:domain` | Get store info (name, branding, etc.) |
| GET | `/api/storefront/:domain/categories` | List store categories |
| GET | `/api/storefront/:domain/categories/:slug` | Get category by slug |

### Products (public)

| Method | Endpoint | Query | Description |
|--------|----------|-------|-------------|
| GET | `/api/storefront/:domain/products` | `?page=1&limit=12&category=` | List published products |
| GET | `/api/storefront/:domain/products/search` | `?q=keyword` | Search products |
| GET | `/api/storefront/:domain/products/:slug` | — | Get product by slug |

### Cart (session-based or customer auth)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/storefront/:domain/cart` | — | Get current cart |
| POST | `/api/storefront/:domain/cart/items` | `{ variant_id, quantity }` | Add to cart |
| PATCH | `/api/storefront/:domain/cart/items/:itemId` | `{ quantity }` | Update cart item |
| DELETE | `/api/storefront/:domain/cart/items/:itemId` | — | Remove from cart |
| POST | `/api/storefront/:domain/cart/apply-coupon` | `{ code }` | Apply coupon |
| DELETE | `/api/storefront/:domain/cart/coupon` | — | Remove coupon |

### Checkout

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/storefront/:domain/checkout` | `{ shipping_address, payment_method, ... }` | Place order |

### Order Lookup (public)

| Method | Endpoint | Query | Description |
|--------|----------|-------|-------------|
| GET | `/api/storefront/:domain/orders/lookup` | `?order_number=&email=` | Lookup order by number + email |

### Customer Auth

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/storefront/:domain/customers/register` | `{ first_name, last_name, email, phone, password }` | Register customer |
| POST | `/api/storefront/:domain/customers/login` | `{ email, password }` | Login customer |

### Customer Account (requires customer JWT)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| GET | `/api/storefront/:domain/customers/me` | — | Get profile |
| PATCH | `/api/storefront/:domain/customers/me` | `{ first_name?, last_name?, phone? }` | Update profile |
| GET | `/api/storefront/:domain/customers/me/orders` | — | My orders |
| POST | `/api/storefront/:domain/customers/me/addresses` | `{ full_name, phone, city, ... }` | Add address |

---

## 📤 Upload (`/api/upload`)

> Requires: `Authorization: Bearer <token>` + store context (x-store-id header or resolved from membership)

| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/api/upload/image` | `multipart/form-data` | Upload & optimize image |
| POST | `/api/upload/file` | `multipart/form-data` | Upload general file |
| DELETE | `/api/upload/:key` | — | Delete uploaded file by key |

---

## 🔔 Webhooks (`/api/webhooks`)

> No auth — called by external providers. Uses HMAC signature verification.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/payment/:provider` | Payment status update |
| POST | `/api/webhooks/shipment/:provider` | Shipment status update |

---

## 📋 Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Platform Owner | `owner@wasl.com` | `Owner123!` |
| Platform Admin | `admin@wasl.com` | `Admin123!` |
| Store Owner | `ahmed@store.com` | `Ahmed123!` |
| Store Staff | `sara@store.com` | `Sara1234!` |

## 🏪 Demo Stores

| Store | Domain | ID (from seed) |
|-------|--------|----------------|
| متجر الأناقة | `elegance-store` | 1 |
| متجر التقنية | `tech-store` | 2 |

## 🎟️ Coupons

- `WELCOME10` — 10% off (elegance-store)
- `SUMMER50` — 50 LYD off (elegance-store)
- `TECH20` — 20% off (tech-store)

---

## 💡 Notes

- Access token expires in 15 minutes. Use `POST /api/auth/refresh` to get a new one.
- Store admin routes require the `:storeId` in the URL path (numeric ID, not domain).
- Storefront routes use the store `:domain` (string, e.g., `elegance-store`).
- All responses follow: `{ success: true, data: {...} }` or `{ success: false, error: "...", statusCode: 4xx }`.
