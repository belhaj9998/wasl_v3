# دليل الباكند لمبرمج الفرونت اند — Wasl SaaS

> هذا الملف مرجع شامل لمبرمج الفرونت اند يشرح كل شيء يحتاجه عن الباكند:
> المعمارية، الـ Authentication، الـ API Endpoints، شكل الطلبات والردود، والأخطاء.

---

## 📐 المعمارية العامة

```
┌─────────────────────────────────────────────────────────────────┐
│                        Express Server                            │
├─────────────────────────────────────────────────────────────────┤
│  Middleware Pipeline:                                            │
│  Helmet → RateLimit → Morgan → CORS → JSON → Cookie → Routes   │
├─────────────────────────────────────────────────────────────────┤
│  Route Groups:                                                  │
│  /api/auth/*           → Auth (تسجيل/دخول/خروج)                │
│  /api/platform/*       → Platform Admin (إدارة المنصة)          │
│  /api/stores/:storeId/* → Store Admin (إدارة المتجر)            │
│  /api/storefront/*     → Storefront (واجهة العميل)              │
│  /api/upload/*         → رفع الملفات                            │
│  /api/webhooks/*       → Webhooks (خارجي)                       │
├─────────────────────────────────────────────────────────────────┤
│  Database: PostgreSQL + Prisma ORM                              │
│  Validation: Zod                                                │
│  Auth: JWT (Access + Refresh tokens)                            │
└─────────────────────────────────────────────────────────────────┘
```

**Base URL:** `http://localhost:3000`

---

## 🔑 نظام المصادقة (Authentication)

### هناك نظامين JWT منفصلين:

| النظام | الاستخدام | Secret Key | مدة الصلاحية |
|--------|-----------|------------|--------------|
| **Admin JWT** | مستخدمي لوحة التحكم (Store Admin + Platform) | `JWT_SECRET` | Access: 15 دقيقة, Refresh: 7 أيام |
| **Customer JWT** | عملاء المتجر (Storefront) | `CUSTOMER_JWT_SECRET` | 7 أيام |

---

### 1. Admin Authentication Flow

```
┌──────────┐     POST /api/auth/login      ┌──────────┐
│  Client  │ ─────────────────────────────→ │  Server  │
│          │ ←───────────────────────────── │          │
│          │  { accessToken } + Cookie      │          │
└──────────┘                                └──────────┘

الـ Access Token → يُرسل في Header: Authorization: Bearer <token>
الـ Refresh Token → يُخزن تلقائياً في httpOnly Cookie (اسمه: refresh_token)
```

#### كيف تستخدمه في الفرونت:

```typescript
// 1. Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // مهم! عشان الكوكي
  body: JSON.stringify({ identifier: 'user@email.com', password: '12345678' })
});
const { data } = await response.json();
// data.accessToken → خزنه في memory (NOT localStorage)
// data.user → بيانات المستخدم

// 2. أي طلب محمي
const res = await fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${accessToken}` }
});

// 3. تجديد التوكن (لما يرجع 401)
const refreshRes = await fetch('/api/auth/refresh', {
  method: 'POST',
  credentials: 'include' // يرسل الكوكي تلقائياً
});
const { data: { accessToken: newToken } } = await refreshRes.json();
```

#### Access Token Payload:
```typescript
{
  userId: number;
  systemRole: "USER" | "SUPPORT" | "PLATFORM_ADMIN" | "PLATFORM_OWNER";
  iat: number;
  exp: number;
}
```

---

### 2. Customer Authentication Flow (Storefront)

```typescript
// 1. تسجيل عميل جديد
const res = await fetch('/api/storefront/my-store/customers/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    first_name: 'أحمد',
    last_name: 'محمد',
    email: 'ahmed@email.com',
    phone: '0912345678',
    password: '12345678'
  })
});
// الرد: { data: { customer, token } }

// 2. دخول عميل
const res = await fetch('/api/storefront/my-store/customers/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'ahmed@email.com', password: '12345678' })
});
// الرد: { data: { customer, token } }

// 3. طلب محمي للعميل
const res = await fetch('/api/storefront/my-store/customers/me', {
  headers: { 'Authorization': `Bearer ${customerToken}` }
});
```

#### Customer Token Payload:
```typescript
{
  customerId: number;
  email: string;
  storeId: number;
  iat: number;
  exp: number;
}
```

---

## 📦 شكل الردود (Response Format)

### كل الردود تتبع نفس الشكل:

```typescript
// ✅ رد ناجح
{
  "success": true,
  "data": { ... },       // البيانات المطلوبة
  "message": "..."       // رسالة اختيارية
}

// ✅ رد ناجح مع Pagination
{
  "success": true,
  "data": [ ... ],       // مصفوفة البيانات
  "meta": {
    "total": 150,        // إجمالي العناصر
    "page": 1,           // الصفحة الحالية
    "limit": 20,         // عدد العناصر بالصفحة
    "totalPages": 8      // إجمالي الصفحات
  },
  "message": "..."
}

// ❌ رد خطأ
{
  "success": false,
  "error": "..." | [...],  // رسالة الخطأ أو مصفوفة أخطاء Zod
  "message": "..."
}
```

---

## ❌ أكواد الأخطاء

| Status Code | المعنى | متى يحصل |
|-------------|--------|-----------|
| `400` | Bad Request | بيانات ناقصة أو غير صحيحة |
| `401` | Unauthorized | توكن مفقود أو منتهي الصلاحية |
| `403` | Forbidden | ما عندك صلاحية |
| `404` | Not Found | المورد غير موجود |
| `409` | Conflict | تكرار (إيميل/دومين موجود) |
| `422` | Validation Error | فشل التحقق من Zod |
| `429` | Too Many Requests | تجاوزت حد الطلبات |
| `500` | Internal Error | خطأ داخلي |

### شكل خطأ Validation (422):
```json
{
  "success": false,
  "error": [
    {
      "code": "too_small",
      "minimum": 8,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "String must contain at least 8 character(s)",
      "path": ["password"]
    }
  ],
  "message": "Validation failed"
}
```

---

## 🏪 Multi-Tenancy (تعدد المتاجر)

### كيف يعرف الباكند أي متجر؟

**لوحة التحكم (Store Admin):**
```
Header: x-store-id: 5
```
كل طلب لـ `/api/stores/:storeId/*` لازم يرسل هذا الهيدر.

**واجهة العميل (Storefront):**
```
URL: /api/storefront/:domain/...
```
الدومين في الـ URL هو اللي يحدد المتجر. مثال: `/api/storefront/my-cool-store/products`

---

## 🔐 نظام الصلاحيات (RBAC)

### الأدوار الافتراضية لكل متجر:
| الدور | Slug | الوصف |
|-------|------|-------|
| Owner | `owner` | صاحب المتجر — كل الصلاحيات |
| Admin | `admin` | مدير — كل الصلاحيات تقريباً |
| Catalog Manager | `catalog-manager` | إدارة المنتجات والفئات |
| Order Manager | `order-manager` | إدارة الطلبات والشحن |
| Inventory Manager | `inventory-manager` | إدارة المخزون |
| Staff | `staff` | صلاحيات محدودة |

### صيغة الصلاحيات:
```
module:action
```
أمثلة: `product:create`, `order:view`, `member:invite`, `store:update`

### كيف تتعامل معها في الفرونت:
- الباكند يرجع 403 إذا المستخدم ما عنده الصلاحية
- يمكنك جلب صلاحيات المستخدم من membership endpoint لإخفاء/إظهار عناصر UI

---

## 📡 جميع الـ API Endpoints

---

### 🔐 Auth — `/api/auth`

| Method | Endpoint | Auth | Body | الوصف |
|--------|----------|------|------|-------|
| POST | `/register` | ❌ | `{ name, email, phone, password }` | تسجيل مستخدم جديد |
| POST | `/login` | ❌ | `{ identifier, password }` | دخول (identifier = email أو phone) |
| POST | `/logout` | ✅ | — | خروج (يمسح الكوكي) |
| POST | `/refresh` | ❌ (Cookie) | — | تجديد Access Token |
| POST | `/forgot-password` | ❌ | `{ email }` | طلب رابط إعادة تعيين |
| POST | `/reset-password` | ❌ | `{ token, new_password }` | إعادة تعيين كلمة المرور |
| GET | `/me` | ✅ | — | جلب بيانات المستخدم الحالي |
| PATCH | `/me` | ✅ | `{ name?, avatar_url? }` | تحديث الملف الشخصي |
| POST | `/change-password` | ✅ | `{ current_password, new_password }` | تغيير كلمة المرور |
| POST | `/stores` | ✅ | `{ name, domain }` | إنشاء متجر جديد |

#### تفاصيل Validation:

```typescript
// Register
{
  name: string;       // 2-100 حرف
  email: string;      // إيميل صالح
  phone: string;      // +?[0-9]{7,15}
  password: string;   // 8-128 حرف
}

// Login
{
  identifier: string; // إيميل أو رقم هاتف
  password: string;   // 1-128 حرف
}

// Create Store
{
  name: string;       // 2-100 حرف
  domain: string;     // 3-63 حرف، lowercase، أرقام وشرطات فقط
}
```

#### ردود Auth:

```typescript
// POST /register → 201
{
  success: true,
  data: {
    user: {
      id: number;
      name: string;
      email: string;
      phone: string;
      avatar_url: string | null;
      system_role: "USER" | "SUPPORT" | "PLATFORM_ADMIN" | "PLATFORM_OWNER";
      is_active: boolean;
      last_login_at: string | null;
      created_at: string;
      updated_at: string;
    },
    accessToken: string;
  },
  message: "Registration successful"
}
// + Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800

// POST /login → 200
// نفس شكل register بس message: "Login successful"

// POST /refresh → 200
{
  success: true,
  data: { accessToken: string },
  message: "Token refreshed"
}

// GET /me → 200
{
  success: true,
  data: { user: { ... } },
  message: "Profile retrieved"
}
```

---

### 🏛️ Platform Admin — `/api/platform`

> يتطلب: `Authorization: Bearer <token>` + المستخدم لازم يكون `PLATFORM_ADMIN` أو `PLATFORM_OWNER`

#### Users

| Method | Endpoint | Query Params | Body | الوصف |
|--------|----------|--------------|------|-------|
| GET | `/users` | `page, limit, sortBy, sortOrder` | — | قائمة المستخدمين |
| GET | `/users/:id` | — | — | تفاصيل مستخدم |
| PATCH | `/users/:id` | — | `{ is_active?, system_role? }` | تعديل مستخدم |
| DELETE | `/users/:id` | — | — | حذف مستخدم (soft) |

#### Stores

| Method | Endpoint | Query Params | Body | الوصف |
|--------|----------|--------------|------|-------|
| GET | `/stores` | `page, limit, sortBy, sortOrder` | — | قائمة المتاجر |
| GET | `/stores/:id` | — | — | تفاصيل متجر |
| PATCH | `/stores/:id/status` | — | `{ status }` | تغيير حالة المتجر |
| DELETE | `/stores/:id` | — | — | حذف متجر (soft) |

**حالات المتجر المسموحة:**
```
DRAFT → ACTIVE
ACTIVE → SUSPENDED, ARCHIVED
SUSPENDED → ACTIVE, ARCHIVED
ARCHIVED → (لا يمكن التغيير)
```

#### Plans (خطط الاشتراك)

| Method | Endpoint | Body | الوصف |
|--------|----------|------|-------|
| GET | `/plans` | — | قائمة الخطط |
| POST | `/plans` | `{ code, name, price_monthly, ... }` | إنشاء خطة |
| GET | `/plans/:id` | — | تفاصيل خطة |
| PATCH | `/plans/:id` | `{ name?, price_monthly?, ... }` | تعديل خطة |
| DELETE | `/plans/:id` | — | حذف خطة |

#### Subscriptions

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/subscriptions` | قائمة الاشتراكات |
| GET | `/subscriptions/:id` | تفاصيل اشتراك |
| PATCH | `/subscriptions/:id` | تعديل اشتراك |

#### Permissions

| Method | Endpoint | Body | الوصف |
|--------|----------|------|-------|
| GET | `/permissions` | — | قائمة الصلاحيات |
| POST | `/permissions` | `{ code, module, action, description? }` | إنشاء صلاحية |
| PATCH | `/permissions/:id` | `{ ... }` | تعديل صلاحية |
| DELETE | `/permissions/:id` | — | حذف صلاحية |

#### Dashboard

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/dashboard/stats` | إحصائيات المنصة |
| GET | `/dashboard/revenue` | الإيرادات |
| GET | `/dashboard/growth` | نمو المتاجر |

---

### 🏪 Store Admin — `/api/stores/:storeId`

> يتطلب:
> - `Authorization: Bearer <token>`
> - `x-store-id: <number>` (في الهيدر)
> - المستخدم لازم يكون عضو في المتجر بصلاحية مناسبة

#### Settings

| Method | Endpoint | Permission | Body | الوصف |
|--------|----------|------------|------|-------|
| GET | `/settings` | `store:view` | — | جلب إعدادات المتجر |
| PATCH | `/settings/general` | `store:update` | `{ name?, domain?, ... }` | تحديث الإعدادات العامة |
| PATCH | `/settings/branding` | `store:update` | `{ logo?, favicon?, ... }` | تحديث البراندنج |
| PATCH | `/settings/seo` | `store:update` | `{ meta_title?, meta_description? }` | تحديث SEO |
| PATCH | `/settings/contact` | `store:update` | `{ support_email?, support_phone?, ... }` | تحديث معلومات التواصل |

#### Members (أعضاء المتجر)

| Method | Endpoint | Permission | Body | الوصف |
|--------|----------|------------|------|-------|
| GET | `/members` | `member:view` | — | قائمة الأعضاء |
| POST | `/members/invite` | `member:invite` | `{ email, role_id }` | دعوة عضو |
| GET | `/members/:memberId` | `member:view` | — | تفاصيل عضو |
| PATCH | `/members/:memberId/role` | `member:update` | `{ role_id }` | تغيير دور العضو |
| DELETE | `/members/:memberId` | `member:remove` | — | إزالة عضو |
| POST | `/members/:memberId/resend-invite` | `member:invite` | — | إعادة إرسال الدعوة |

#### Roles (الأدوار)

| Method | Endpoint | Permission | Body | الوصف |
|--------|----------|------------|------|-------|
| GET | `/roles` | `role:view` | — | قائمة الأدوار |
| POST | `/roles` | `role:create` | `{ name, slug, description? }` | إنشاء دور |
| GET | `/roles/:roleId` | `role:view` | — | تفاصيل دور |
| PATCH | `/roles/:roleId` | `role:update` | `{ name?, description? }` | تعديل دور |
| DELETE | `/roles/:roleId` | `role:delete` | — | حذف دور |
| PUT | `/roles/:roleId/permissions` | `role:update` | `{ permission_ids: number[] }` | تحديث صلاحيات الدور |

#### Categories (الفئات)

| Method | Endpoint | Permission | Body | الوصف |
|--------|----------|------------|------|-------|
| GET | `/categories` | `category:view` | — | قائمة الفئات (شجرية) |
| POST | `/categories` | `category:create` | `{ name, slug, parent_id?, ... }` | إنشاء فئة |
| GET | `/categories/:id` | `category:view` | — | تفاصيل فئة |
| PATCH | `/categories/:id` | `category:update` | `{ name?, slug?, ... }` | تعديل فئة |
| DELETE | `/categories/:id` | `category:delete` | — | حذف فئة |
| PATCH | `/categories/reorder` | `category:update` | `[{ id, sort_order }]` | إعادة ترتيب |

#### Products (المنتجات)

| Method | Endpoint | Permission | Body | الوصف |
|--------|----------|------------|------|-------|
| GET | `/products` | `product:view` | — | قائمة المنتجات (مع فلاتر) |
| POST | `/products` | `product:create` | `{ name, slug, base_price, ... }` | إنشاء منتج |
| GET | `/products/:id` | `product:view` | — | تفاصيل منتج |
| PATCH | `/products/:id` | `product:update` | `{ name?, base_price?, ... }` | تعديل منتج |
| DELETE | `/products/:id` | `product:delete` | — | حذف منتج |
| PATCH | `/products/:id/status` | `product:update` | `{ status }` | تغيير حالة المنتج |
| POST | `/products/:id/publish` | `product:update` | `{ is_published }` | نشر/إخفاء |
| POST | `/products/:id/duplicate` | `product:create` | — | تكرار منتج |

**حالات المنتج:** `DRAFT`, `ACTIVE`, `ARCHIVED`

#### Product Options & Values

| Method | Endpoint | Permission | Body | الوصف |
|--------|----------|------------|------|-------|
| GET | `/products/:productId/options` | `product:view` | — | خيارات المنتج |
| POST | `/products/:productId/options` | `product:create` | `{ name, position? }` | إنشاء خيار (مثل: اللون) |
| PATCH | `/products/:productId/options/:optionId` | `product:update` | `{ name?, position? }` | تعديل خيار |
| DELETE | `/products/:productId/options/:optionId` | `product:delete` | — | حذف خيار |
| POST | `/products/:productId/options/:optionId/values` | `product:create` | `{ value, position? }` | إضافة قيمة (مثل: أحمر) |
| PATCH | `/.../values/:valueId` | `product:update` | `{ value?, position? }` | تعديل قيمة |
| DELETE | `/.../values/:valueId` | `product:delete` | — | حذف قيمة |

#### Variants (المتغيرات)

| Method | Endpoint | Permission | Body | الوصف |
|--------|----------|------------|------|-------|
| GET | `/products/:productId/variants` | `product:view` | — | متغيرات المنتج |
| POST | `/products/:productId/variants` | `product:create` | `{ title, sku, price?, ... }` | إنشاء متغير |
| POST | `/products/:productId/variants/generate` | `product:create` | — | توليد كل التوليفات |
| GET | `/variants/:variantId` | `product:view` | — | تفاصيل متغير |
| PATCH | `/variants/:variantId` | `product:update` | `{ title?, sku?, price?, ... }` | تعديل متغير |
| DELETE | `/variants/:variantId` | `product:delete` | — | حذف متغير |
| PATCH | `/variants/:variantId/set-default` | `product:update` | — | تعيين كافتراضي |

#### Inventory (المخزون)

| Method | Endpoint | Permission | الوصف |
|--------|----------|------------|-------|
| GET | `/inventory` | `inventory:view` | قائمة المخزون |
| GET | `/inventory/low-stock` | `inventory:view` | المخزون المنخفض |
| GET | `/inventory/movements` | `inventory:view` | حركات المخزون |
| GET | `/inventory/:variantId` | `inventory:view` | مخزون متغير معين |
| POST | `/inventory/:variantId/adjust` | `inventory:adjust` | تعديل المخزون |
| GET | `/inventory/:variantId/movements` | `inventory:view` | حركات متغير معين |

```typescript
// POST /inventory/:variantId/adjust
{
  type: "IN" | "ADJUSTMENT_IN" | "OUT" | "ADJUSTMENT_OUT";
  quantity_change: number;  // موجب دائماً
  reason?: string;
}
```

#### Media (الوسائط)

| Method | Endpoint | Permission | الوصف |
|--------|----------|------------|-------|
| POST | `/products/:productId/media` | `product:create` | رفع صورة (multipart/form-data, field: "file") |
| PATCH | `/products/:productId/media/:id` | `product:update` | تعديل alt text |
| DELETE | `/products/:productId/media/:id` | `product:delete` | حذف صورة |
| PATCH | `/products/:productId/media/reorder` | `product:update` | إعادة ترتيب |

```typescript
// رفع صورة — FormData
const formData = new FormData();
formData.append('file', imageFile); // max 5MB

fetch(`/api/stores/${storeId}/products/${productId}/media`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'x-store-id': storeId },
  body: formData
});
```

#### Customers (العملاء)

| Method | Endpoint | Permission | الوصف |
|--------|----------|------------|-------|
| GET | `/customers` | `customer:view` | قائمة العملاء |
| POST | `/customers` | `customer:create` | إنشاء عميل |
| GET | `/customers/:customerId` | `customer:view` | تفاصيل عميل |
| PATCH | `/customers/:customerId` | `customer:update` | تعديل عميل |
| DELETE | `/customers/:customerId` | `customer:delete` | حذف عميل (soft) |
| GET | `/customers/:customerId/orders` | `customer:view` | طلبات العميل |
| GET | `/customers/:customerId/addresses` | `customer:view` | عناوين العميل |
| POST | `/customers/:customerId/addresses` | `customer:create` | إضافة عنوان |
| PATCH | `/customers/:customerId/addresses/:addressId` | `customer:update` | تعديل عنوان |
| DELETE | `/customers/:customerId/addresses/:addressId` | `customer:delete` | حذف عنوان |
| PATCH | `/customers/:customerId/addresses/:addressId/set-default` | `customer:update` | تعيين افتراضي |

#### Coupons (الكوبونات)

| Method | Endpoint | Permission | الوصف |
|--------|----------|------------|-------|
| GET | `/coupons` | `coupon:view` | قائمة الكوبونات |
| POST | `/coupons` | `coupon:create` | إنشاء كوبون |
| GET | `/coupons/:couponId` | `coupon:view` | تفاصيل كوبون |
| PATCH | `/coupons/:couponId` | `coupon:update` | تعديل كوبون |
| DELETE | `/coupons/:couponId` | `coupon:delete` | حذف كوبون |
| GET | `/coupons/:couponId/usages` | `coupon:view` | سجل الاستخدام |
| POST | `/coupons/validate` | `coupon:view` | التحقق من صلاحية كوبون |

```typescript
// POST /coupons
{
  code: string;                    // كود الكوبون
  type: "PERCENTAGE" | "FIXED";    // نوع الخصم
  value: number;                   // القيمة (نسبة أو مبلغ)
  minimum_order_amount?: number;   // الحد الأدنى للطلب
  maximum_discount_amount?: number; // أقصى خصم
  usage_limit?: number;            // حد الاستخدام الكلي
  usage_limit_per_customer?: number; // حد الاستخدام لكل عميل
  starts_at?: string;              // تاريخ البداية
  ends_at?: string;                // تاريخ الانتهاء
  is_active?: boolean;
}
```

#### Orders (الطلبات)

| Method | Endpoint | Permission | الوصف |
|--------|----------|------------|-------|
| GET | `/orders` | `order:view` | قائمة الطلبات |
| POST | `/orders` | `order:create` | إنشاء طلب يدوي |
| GET | `/orders/:orderId` | `order:view` | تفاصيل طلب |
| PATCH | `/orders/:orderId/status` | `order:update` | تغيير حالة الطلب |
| POST | `/orders/:orderId/cancel` | `order:cancel` | إلغاء طلب |
| POST | `/orders/:orderId/notes` | `order:update` | إضافة ملاحظة |
| GET | `/orders/:orderId/timeline` | `order:view` | سجل أحداث الطلب |

**حالات الطلب (Order Status Machine):**
```
DRAFT → PENDING → CONFIRMED → PROCESSING → PREPARING → SHIPPED → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED
أي حالة → CANCELED (ما عدا DELIVERED)
DELIVERED → RETURNED
```

#### Shipments (الشحنات)

| Method | Endpoint | Permission | الوصف |
|--------|----------|------------|-------|
| GET | `/orders/:orderId/shipments` | `shipment:view` | شحنات الطلب |
| POST | `/orders/:orderId/shipments` | `shipment:create` | إنشاء شحنة |
| GET | `/shipments/:shipmentId` | `shipment:view` | تفاصيل شحنة |
| PATCH | `/shipments/:shipmentId` | `shipment:update` | تعديل شحنة |
| PATCH | `/shipments/:shipmentId/status` | `shipment:update` | تغيير حالة الشحنة |

#### Payments (المدفوعات)

| Method | Endpoint | Permission | الوصف |
|--------|----------|------------|-------|
| GET | `/orders/:orderId/payments` | `payment:view` | مدفوعات الطلب |
| POST | `/orders/:orderId/payments` | `payment:create` | تسجيل دفعة |
| POST | `/orders/:orderId/refunds` | `payment:refund` | استرداد |

#### Dashboard (لوحة التحكم)

| Method | Endpoint | Permission | الوصف |
|--------|----------|------------|-------|
| GET | `/dashboard/overview` | `dashboard:view` | نظرة عامة |
| GET | `/dashboard/sales-stats` | `dashboard:view` | إحصائيات المبيعات |
| GET | `/dashboard/inventory-alerts` | `dashboard:view` | تنبيهات المخزون |

---

### 🛒 Storefront (واجهة العميل) — `/api/storefront/:domain`

> هذي الـ APIs اللي يستخدمها العميل النهائي (المشتري).
> الـ `:domain` هو دومين المتجر (مثل: `my-cool-store`).

#### Session Management:
- الباكند يعطي كوكي `storefront_session` تلقائياً لكل زائر
- هذا الكوكي يُستخدم لربط السلة بالزائر (Guest Cart)
- صلاحيته 7 أيام

---

#### Store Info (عام — بدون تسجيل دخول)

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/:domain` | بيانات المتجر (اسم، لوقو، وصف، سوشيال، SEO) |
| GET | `/:domain/categories` | شجرة الفئات |
| GET | `/:domain/categories/:slug` | فئة مع منتجاتها (paginated) |

#### Products (عام)

| Method | Endpoint | Query Params | الوصف |
|--------|----------|--------------|-------|
| GET | `/:domain/products` | `page, limit, category_id, min_price, max_price, sort_by, sort_order` | قائمة المنتجات |
| GET | `/:domain/products/search` | `query, page, limit` | بحث في المنتجات |
| GET | `/:domain/products/:slug` | — | تفاصيل منتج (بالـ slug) |

```typescript
// GET /api/storefront/my-store/products?page=1&limit=20&category_id=5&sort_by=price&sort_order=asc
// GET /api/storefront/my-store/products/search?query=قميص&page=1&limit=20
```

#### Cart (السلة — يعمل للزائر والمسجل)

| Method | Endpoint | Body | الوصف |
|--------|----------|------|-------|
| GET | `/:domain/cart` | — | جلب السلة الحالية |
| POST | `/:domain/cart/items` | `{ product_id, variant_id, quantity }` | إضافة للسلة |
| PATCH | `/:domain/cart/items/:itemId` | `{ quantity }` | تعديل الكمية (0 = حذف) |
| DELETE | `/:domain/cart/items/:itemId` | — | حذف من السلة |
| POST | `/:domain/cart/apply-coupon` | `{ code }` | تطبيق كوبون |
| DELETE | `/:domain/cart/coupon` | — | إزالة الكوبون |

```typescript
// إضافة للسلة
await fetch('/api/storefront/my-store/cart/items', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // مهم للكوكي!
  body: JSON.stringify({
    product_id: 15,
    variant_id: 42,
    quantity: 2
  })
});
```

#### Checkout (الدفع)

| Method | Endpoint | Body | الوصف |
|--------|----------|------|-------|
| POST | `/:domain/checkout` | (انظر أدناه) | إنشاء طلب من السلة |

```typescript
// POST /api/storefront/my-store/checkout
{
  customer_name: "أحمد محمد",           // 2-100 حرف
  customer_phone: "+218912345678",      // صيغة ليبية: +218XXXXXXXXX
  customer_email: "ahmed@email.com",    // اختياري

  shipping_address: {
    full_name: "أحمد محمد",
    phone: "0912345678",               // اختياري
    city: "طرابلس",
    region: "حي الأندلس",              // اختياري
    street_line_1: "شارع الجمهورية",
    street_line_2: "بجانب مسجد...",    // اختياري
    postal_code: "00218",              // اختياري
    google_maps_url: "https://..."     // اختياري
  },

  payment_method: "CASH_ON_DELIVERY",
  // القيم المسموحة: "CASH_ON_DELIVERY" | "CARD" | "BANK_TRANSFER" | "WALLET" | "MANUAL"

  notes_from_customer: "يرجى التوصيل صباحاً"  // اختياري، max 1000 حرف
}
```

**Rate Limit:** 5 طلبات checkout بالدقيقة لكل IP

#### Order Lookup (البحث عن طلب — بدون تسجيل دخول)

| Method | Endpoint | Query Params | الوصف |
|--------|----------|--------------|-------|
| GET | `/:domain/orders/lookup` | `order_number, verification_value` | بحث عن طلب |

```typescript
// GET /api/storefront/my-store/orders/lookup?order_number=ORD-001&verification_value=0912345678
```

**Rate Limit:** 10 طلبات كل 15 دقيقة لكل IP

#### Customer Auth (تسجيل/دخول العميل)

| Method | Endpoint | Rate Limit | Body | الوصف |
|--------|----------|------------|------|-------|
| POST | `/:domain/customers/register` | 3/دقيقة | `{ first_name, last_name?, email, phone, password }` | تسجيل عميل |
| POST | `/:domain/customers/login` | 5/دقيقة | `{ email, password }` | دخول عميل |

#### Customer Protected (يتطلب Customer Token)

| Method | Endpoint | Body | الوصف |
|--------|----------|------|-------|
| GET | `/:domain/customers/me` | — | بيانات العميل |
| PATCH | `/:domain/customers/me` | `{ first_name?, last_name?, email?, phone?, ... }` | تحديث البيانات |
| GET | `/:domain/customers/me/orders` | — | طلبات العميل |
| POST | `/:domain/customers/me/addresses` | `{ full_name, city, street_line_1, ... }` | إضافة عنوان |

---

### 📤 Upload — `/api/upload`

> يتطلب: `Authorization: Bearer <token>` + `x-store-id`

| Method | Endpoint | الوصف |
|--------|----------|-------|
| POST | `/image` | رفع صورة (يتم تحويلها لـ WebP وضغطها) |
| POST | `/file` | رفع ملف عام |
| DELETE | `/:key` | حذف ملف |

---

### 🔗 Health Check

| Method | Endpoint | الوصف |
|--------|----------|-------|
| GET | `/api/health` | فحص صحة السيرفر والداتابيز |

```typescript
// Response
{
  success: true,
  data: {
    status: "healthy",
    uptime: 12345.67,
    timestamp: "2025-01-15T10:30:00.000Z"
  }
}
```

---

## 🧩 أنماط مهمة للفرونت

### 1. Axios/Fetch Interceptor Pattern

```typescript
// مثال مع Axios
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  withCredentials: true, // مهم للكوكيز
});

let accessToken: string | null = null;

// Request interceptor — يضيف التوكن
api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// Response interceptor — يجدد التوكن عند 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const { data } = await api.post('/auth/refresh');
        accessToken = data.data.accessToken;
        error.config.headers.Authorization = `Bearer ${accessToken}`;
        return api(error.config);
      } catch {
        // Refresh فشل — وجه المستخدم لصفحة الدخول
        accessToken = null;
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
```

### 2. Store Context Header

```typescript
// لكل طلبات Store Admin — لازم تضيف x-store-id
const storeApi = axios.create({
  baseURL: 'http://localhost:3000/api/stores',
  withCredentials: true,
});

storeApi.interceptors.request.use((config) => {
  const storeId = getCurrentStoreId(); // من الـ state
  config.headers['x-store-id'] = storeId;
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// الاستخدام:
const products = await storeApi.get(`/${storeId}/products`);
```

### 3. Storefront API Pattern

```typescript
// واجهة العميل — تستخدم الدومين في URL
const storefrontApi = axios.create({
  baseURL: 'http://localhost:3000/api/storefront',
  withCredentials: true, // مهم للـ session cookie
});

// الاستخدام:
const store = await storefrontApi.get('/my-store');
const products = await storefrontApi.get('/my-store/products?page=1&limit=20');
const cart = await storefrontApi.get('/my-store/cart');
```

### 4. Error Handling Pattern

```typescript
try {
  const response = await api.post('/auth/login', { identifier, password });
  // نجاح
} catch (error) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const body = error.response?.data;

    switch (status) {
      case 401:
        showToast('بيانات الدخول غير صحيحة');
        break;
      case 403:
        showToast('ليس لديك صلاحية');
        break;
      case 409:
        showToast('هذا البريد مسجل مسبقاً');
        break;
      case 422:
        // أخطاء validation — اعرضها بجانب الحقول
        const issues = body.error; // ZodIssue[]
        issues.forEach(issue => {
          setFieldError(issue.path[0], issue.message);
        });
        break;
      case 429:
        showToast('طلبات كثيرة، حاول بعد قليل');
        break;
      default:
        showToast('حدث خطأ غير متوقع');
    }
  }
}
```

### 5. Pagination Pattern

```typescript
interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

async function fetchPaginated<T>(url: string, params: PaginationParams) {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit),
    ...(params.sortBy && { sortBy: params.sortBy }),
    ...(params.sortOrder && { sortOrder: params.sortOrder }),
  });

  const { data } = await api.get(`${url}?${query}`);
  return {
    items: data.data as T[],
    meta: data.meta as { total: number; page: number; limit: number; totalPages: number }
  };
}

// الاستخدام:
const { items: products, meta } = await fetchPaginated('/stores/5/products', {
  page: 1, limit: 20, sortBy: 'created_at', sortOrder: 'desc'
});
```

---

## 📊 Database Models Reference (مرجع سريع)

### الـ Enums المهمة:

```typescript
type SystemRole = "USER" | "SUPPORT" | "PLATFORM_ADMIN" | "PLATFORM_OWNER";
type StoreStatus = "DRAFT" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";
type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
type CustomerStatus = "ACTIVE" | "BLOCKED" | "ARCHIVED";
type CartStatus = "OPEN" | "CONVERTED" | "ABANDONED" | "EXPIRED";
type OrderSource = "STOREFRONT" | "ADMIN" | "MANUAL" | "INSTAGRAM" | "FACEBOOK" | "TIKTOK";

type ShipmentStatus = "DRAFT" | "PENDING" | "CONFIRMED" | "PROCESSING" | "PREPARING"
  | "SHIPPED" | "IN_TRANSIT" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELED" | "RETURNED";

type PaymentStatus = "UNPAID" | "PENDING" | "PARTIALLY_PAID" | "PAID"
  | "FAILED" | "REFUNDED" | "PARTIALLY_REFUNDED";

type PaymentMethod = "CASH_ON_DELIVERY" | "CARD" | "BANK_TRANSFER" | "WALLET" | "MANUAL";
type DiscountType = "PERCENTAGE" | "FIXED";
type AddressType = "SHIPPING" | "BILLING" | "OTHER";
type MembershipStatus = "ACTIVE" | "INVITED" | "SUSPENDED";
type BillingCycle = "MONTHLY" | "YEARLY";
type SubscriptionStatus = "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";

type InventoryMovementType = "IN" | "ADJUSTMENT_IN" | "OUT" | "ADJUSTMENT_OUT"
  | "RESERVED" | "RELEASED" | "RETURNED";
```

---

## ⚡ Rate Limits

| Endpoint | الحد | النافذة |
|----------|------|---------|
| Global (كل الطلبات) | 100 طلب | 15 دقيقة |
| Auth (login/forgot-password) | 5 طلبات | 15 دقيقة |
| Storefront Checkout | 5 طلبات | 1 دقيقة |
| Storefront Login | 5 طلبات | 1 دقيقة |
| Storefront Register | 3 طلبات | 1 دقيقة |
| Order Lookup | 10 طلبات | 15 دقيقة |

عند تجاوز الحد، الرد:
```json
{ "success": false, "error": "Too many requests", "message": "Too many requests, please try again later." }
```
Status: `429`

---

## 🔧 Environment & CORS

- **CORS Origins:** يتم تحديدها من `CORS_ORIGINS` env variable (comma-separated)
- **Credentials:** `credentials: true` — لازم ترسل `withCredentials: true` في الفرونت
- **Content-Type:** كل الطلبات `application/json` ما عدا رفع الملفات (`multipart/form-data`)
- **Max Body Size:** 10MB

---

## 📝 ملاحظات مهمة

1. **Soft Delete:** المتاجر، المستخدمين، المنتجات، والعملاء لا يُحذفون فعلياً — يتم تعيين `deleted_at`
2. **Timestamps:** كل التواريخ بصيغة ISO 8601 (`2025-01-15T10:30:00.000Z`)
3. **Currency:** العملة الافتراضية `LYD` (دينار ليبي)
4. **Locale:** الافتراضي `ar-LY`
5. **Timezone:** الافتراضي `Africa/Tripoli`
6. **الأسعار:** تُخزن كـ `Decimal` — تأكد من التعامل معها كـ string أو number بدقة
7. **الصور:** تُحول تلقائياً لـ WebP عند الرفع
8. **الـ Slug:** يُستخدم في URLs بدل الـ ID (للمنتجات والفئات في الـ Storefront)

---

## 🚀 Quick Start للفرونت

```bash
# 1. تأكد إن الباكند شغال
curl http://localhost:3000/api/health

# 2. سجل مستخدم
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"أحمد","email":"ahmed@test.com","phone":"+218912345678","password":"12345678"}'

# 3. أنشئ متجر
curl -X POST http://localhost:3000/api/auth/stores \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"متجري","domain":"my-store"}'
```

---

> **آخر تحديث:** مايو 2026
> **الباكند:** Express 5 + Prisma 7 + PostgreSQL + TypeScript
