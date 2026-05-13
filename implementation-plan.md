# خطة التنفيذ النهائية — متجر إلكتروني متعدد المتاجر (ليبيا)
## Express + Prisma + PostgreSQL + Zod

---

## 📋 قرارات معمارية

| القرار | التفاصيل |
|--------|----------|
| **Architecture** | Monolith with modular controllers |
| **Database** | PostgreSQL 15+ |
| **ORM** | Prisma |
| **Validation** | Zod |
| **Auth** | JWT (access + refresh tokens) |
| **File Upload** | AWS S3 / Local (configurable) |
| **Payments** | Stripe + Paymob (Libya) |
| **Shipping** | Manual zones + rates |
| **Tax** | Configurable per region |
| **Currency** | LYD (Libyan Dinar) |

---

## 🏗️ هيكل المجلدات

```
src/
├── config/           # Database, env, constants
├── controllers/      # All route handlers
│   ├── auth/
│   ├── platform/
│   ├── store-admin/
│   ├── storefront/
│   └── shared/
├── middlewares/      # Auth, Tenant, RBAC, Validation, Error, Upload
├── services/         # Business logic (per controller)
├── validators/       # Zod schemas
├── utils/            # Helpers, formatters
├── types/            # TypeScript interfaces
├── prisma/           # Schema + migrations
└── app.ts            # Express setup
```

---

## 📅 المرحلة 0 — البنية التحتية (أسبوع 1)

### Tasks:
1. **إعداد المشروع**
   - `npm init` + Express + Prisma + TypeScript
   - ESLint + Prettier + Husky
   - `.env` template

2. **Prisma Setup**
   - `schema.prisma` (الملف النهائي المرفق)
   - `prisma migrate dev --name init`
   - Seed data (users, permissions, plans)

3. **Express Core**
   - `app.ts` setup
   - `express.json()` + `express.raw()` for webhooks
   - CORS configuration
   - Helmet + Rate Limiting
   - Morgan logging

4. **Middlewares**
   - `error.middleware.ts` — Centralized error handler
     - Prisma P2002 (unique violation)
     - Prisma P2025 (record not found)
     - Zod validation errors
     - Custom AppError class
   - `validate.middleware.ts` — Zod validation
   - `auth.middleware.ts` — JWT verify
   - `tenant.middleware.ts` — Extract store_id
   - `rbac.middleware.ts` — Permission check

5. **BaseService**
   - Generic CRUD operations
   - Pagination helper
   - Sorting & filtering
   - Soft delete support

### Deliverables:
- [ ] Project runs with `npm run dev`
- [ ] Database seeded
- [ ] Health check endpoint works
- [ ] Error handling tested

---

## 📅 المرحلة 1 — Auth + Platform (أسبوع 2)

### Controllers (6 controllers, 30+ endpoints)

**Auth Controller:**
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/logout
- POST /api/auth/refresh
- POST /api/auth/forgot-password
- POST /api/auth/reset-password
- POST /api/auth/verify-email
- POST /api/auth/verify-phone
- GET  /api/auth/me

**Platform Controllers:**
- User management (CRUD + ban)
- Store management (approve, suspend, stats)
- Subscription plans (CRUD)
- Permissions (CRUD)
- Reports (sales, stores, revenue)
- Settings (platform-wide)

### Key Implementation:
- **JWT Strategy**: Access token (15 min) + Refresh token (7 days)
- **Password Hashing**: bcrypt (12 rounds)
- **Email Verification**: Resendable token (24h expiry)
- **Phone Verification**: OTP via SMS gateway
- **Superadmin Guard**: `is_superadmin` check

### Deliverables:
- [ ] Auth flow complete (register → verify → login)
- [ ] Platform admin can manage users & stores
- [ ] Role/Permission system working

---

## 📅 المرحلة 2 — إعداد المتجر + الأعضاء + الأدوار (أسبوع 3)

### Controllers (3 controllers, 16 endpoints)

**Store Setup:**
- GET    /api/admin/store
- PATCH  /api/admin/store
- PATCH  /api/admin/store/settings
- PATCH  /api/admin/store/branding
- PATCH  /api/admin/store/seo
- PATCH  /api/admin/store/contact

**Members:**
- GET    /api/admin/members
- POST   /api/admin/members (invite by email)
- PATCH  /api/admin/members/:id/role
- DELETE /api/admin/members/:id

**Roles:**
- GET    /api/admin/roles
- POST   /api/admin/roles
- PATCH  /api/admin/roles/:id
- DELETE /api/admin/roles/:id
- PATCH  /api/admin/roles/:id/permissions

### Key Implementation:
- **Store Creation**: Auto-create StoreSetting, StoreBranding, StoreSEO, StoreContact
- **Member Invite**: Email invitation with token
- **Default Roles**: Owner, Admin, Manager, Staff (auto-created per store)
- **Permission Seeding**: 20+ permissions (product:create, order:update, etc.)

### Deliverables:
- [ ] Store setup wizard works
- [ ] Member invitation flow complete
- [ ] RBAC tested with different roles

---

## 📅 المرحلة 3 — كتالوج المنتجات الكامل (أسبوع 4-5)

### Controllers (10 controllers, 50+ endpoints)

**Categories:**
- Full CRUD + reorder + tree structure

**Products:**
- Full CRUD + publish/unpublish + duplicate
- List with filters (status, category, price range, search)
- Bulk operations (delete, publish)

**Product Options & Values:**
- POST   /api/admin/products/:id/options
- POST   /api/admin/products/:id/options/:optionId/values
- Full CRUD for options & values

**Variants:**
- Create with option values combination
- Update price, SKU, barcode, inventory
- Bulk variant generation from options

**Inventory:**
- Stock management per variant
- Adjustments (inbound, outbound, adjustment, transfer)
- Low stock alerts
- Inventory history

**Media:**
- Upload to S3/local
- Reorder images
- Set alt text

### Key Implementation:
- **Variant Generation**: Auto-create all combinations from options
- **Inventory Sync**: `available = total - reserved`
- **Product Duplication**: Clone product + options + variants (reset inventory)
- **Search**: Full-text search on name, description, SKU

### Deliverables:
- [ ] Product CRUD complete with options/variants
- [ ] Inventory tracking works
- [ ] Media upload works
- [ ] Search & filters working

---

## 📅 المرحلة 4 — الطلبات والشحن والتقارير (أسبوع 6-7)

### Controllers (5 controllers, 24 endpoints)

**Orders:**
- List with advanced filters (status, date, customer, amount)
- Get order details with items, timeline, shipments
- Update status (with validation of allowed transitions)
- Cancel order (with inventory rollback)
- Refund processing
- Print invoice

**Shipments:**
- Create shipment for order
- Update tracking info
- Mark as shipped/delivered
- Shipping label generation

**Customers:**
- Full CRUD
- Order history
- Address book

**Coupons:**
- Create (percentage/fixed amount)
- Apply to: all products / categories / specific products
- Usage limits & expiry
- Validation at checkout

**Reports:**
- Sales report (daily/weekly/monthly)
- Product performance
- Customer analytics
- Inventory report
- Export to CSV/PDF

### Key Implementation:
- **Order Status Machine**: Valid transitions only
  ```
  DRAFT → PENDING → CONFIRMED → PROCESSING → PREPARING → SHIPPED → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED
  Any → CANCELED (if not delivered)
  DELIVERED → RETURNED
  ```
- **Inventory Rollback**: On cancel, restore reserved quantity
- **Coupon Validation**: Check expiry, usage limit, min order, applicability
- **Timeline**: Auto-create entry on every status change

### Deliverables:
- [ ] Order management complete
- [ ] Shipping workflow works
- [ ] Reports generated correctly
- [ ] Coupon system tested

---

## 📅 المرحلة 5 — واجهة العميل الكاملة (أسبوع 8-9)

### Controllers (6 controllers, 23 endpoints)

**Storefront:**
- Store info & categories
- Product browsing (with filters, sorting, pagination)
- Product details with variants selection
- Search with autocomplete

**Cart:**
- Add/update/remove items
- Apply/remove coupon
- Cart persistence (guest + logged in)

**Checkout:**
- Guest checkout support
- Address selection/entry
- Shipping rate calculation
- Tax calculation
- Payment integration (Stripe/Paymob)
- Order confirmation

**Customer Account:**
- Register/Login
- Profile management
- Address book
- Order history & tracking
- Wishlist

**Reviews:**
- Submit review (after delivery)
- List approved reviews
- Rating summary

### Key Implementation:
- **Checkout Transaction** (9 steps in Prisma $transaction):
  1. Validate cart & stock
  2. Create Order + OrderItems (snapshot data)
  3. Deduct inventory (create InventoryMovement)
  4. Create OrderAddress
  5. Apply coupon (create CouponUsage)
  6. Create OrderTimeline
  7. Clear cart
  8. Create PaymentTransaction
  9. Update order totals

- **Guest Checkout**: Session-based cart, email-only required
- **Payment Flow**:
  - Stripe: Create PaymentIntent → Confirm → Webhook
  - Paymob: Tokenize card → Pay → Webhook
- **Shipping Calculation**: Based on zones + order total/weight

### Deliverables:
- [ ] Full storefront works end-to-end
- [ ] Checkout with payment works
- [ ] Customer account complete
- [ ] Guest checkout works

---

## 📅 المرحلة 6 — الرفع + Webhooks + النظام (أسبوع 10)

### Controllers (2 controllers, 5 endpoints)

**Upload:**
- Image optimization (sharp)
- S3 upload with signed URLs
- File deletion

**Webhooks:**
integrate with tlync
- Shipping carriers: status updates

### System Tasks:
- **Graceful Shutdown**: SIGTERM handling
- **Cron Jobs**:
  - Daily: Low stock notifications
  - Hourly: Cleanup expired carts
  - Daily: Order confirmation reminders
- **Email Templates**: Order confirmation, shipping, refund
- **SMS Notifications**: Order status updates (Libya)

### Deliverables:
- [ ] Upload system works
- [ ] Webhooks handle all events
- [ ] Cron jobs running
- [ ] Email/SMS notifications sent

---

## 🧪 اختبار & جودة

### Unit Tests (Jest):
- Services layer
- Validation schemas
- Utility functions

### Integration Tests:
- Auth flow
- Product CRUD
- Checkout flow
- Order lifecycle

### E2E Tests:
- Full customer journey
- Admin workflow

### Performance:
- Load test: 100 concurrent users
- DB query optimization (explain analyze)
- Index review

---

## 🚀 النشر

### Environment Setup:
- **Development**: Local PostgreSQL + ngrok for webhooks
- **Staging**: Render/Railway + test DB
- **Production**: VPS (AWS/DigitalOcean) + managed PostgreSQL

### CI/CD:
- GitHub Actions: Test → Build → Deploy
- Prisma migrate in pipeline
- Environment variables in secrets

### Monitoring:
- Sentry for error tracking
- Logtail for logs
- Uptime monitoring

---

## 📊 ملخص الأرقام

| البند | العدد |
|-------|-------|
| **Controllers** | 32 |
| **Services** | 32 |
| **Endpoints** | ~150 |
| **Models** | 35+ |
| **Enums** | 6 |
| **Middlewares** | 7 |
| **Weeks** | 10 |

---

## ⚠️ مخاطر وتحديات

| المخاطر | الحل |
|---------|------|
| **Payment in Libya** | tlync + cash on delivery |
| **Shipping APIs** | Manual zones + local carriers |
| **Multi-tenant performance** | Indexing + connection pooling |
| **Image storage** | S3 with CDN |
| **SMS gateway** | Twilio or local provider |

---

## ✅ Checklist قبل كل مرحلة

- [ ] `prisma validate` passes
- [ ] `prisma migrate dev` succeeds
- [ ] All new endpoints tested in Postman
- [ ] Error handling verified
- [ ] RBAC permissions checked
- [ ] Soft deletes working
- [ ] Tenant isolation verified
- [ ] Documentation updated

---

**الخطة جاهزة للتنفيذ — ابدأ بالمرحلة 0 ولا تتخطى أي خطوة.**
