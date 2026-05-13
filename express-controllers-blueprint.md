# 🗺️ خارطة بناء Controllers — Express.js

> بناءً على Prisma Schema النهائي — خطة شاملة لجميع Controllers المطلوبة

---

## 📁 هيكل المجلدات المقترح

```
src/
├── config/               # الإعدادات (DB, Redis, etc.)
├── middlewares/          # الوسائط (Auth, Validation, Tenant, etc.)
│   ├── auth.middleware.ts
│   ├── tenant.middleware.ts
│   ├── rbac.middleware.ts
│   ├── validate.middleware.ts
│   └── error.middleware.ts
├── controllers/          # 👈 Controllers (هذا الملف)
│   ├── auth/
│   ├── platform/
│   ├── store-admin/
│   ├── storefront/
│   └── shared/
├── services/             # منطق الأعمال
├── routes/               # تعريف المسارات
├── validators/           # Joi / Zod schemas
├── utils/                # أدوات مساعدة
└── types/                # TypeScript types
```

---

## 🔐 1. Auth Controllers

> مسؤولة عن المصادقة والتفويض على مستوى المنصة

### `auth.controller.ts`

| Method                           | Route              | الوصف                       |
| -------------------------------- | ------------------ | --------------------------- |
| `POST /api/auth/register`        | `register()`       | تسجيل مستخدم جديد           |
| `POST /api/auth/login`           | `login()`          | تسجيل دخول                  |
| `POST /api/auth/logout`          | `logout()`         | تسجيل خروج                  |
| `POST /api/auth/refresh`         | `refreshToken()`   | تجديد التوكن                |
| `POST /api/auth/forgot-password` | `forgotPassword()` | طلب إعادة تعيين كلمة المرور |
| `POST /api/auth/reset-password`  | `resetPassword()`  | إعادة تعيين كلمة المرور     |
| `GET /api/auth/me`               | `getCurrentUser()` | بيانات المستخدم الحالي      |
| `PATCH /api/auth/me`             | `updateProfile()`  | تحديث الملف الشخصي          |
| `POST /api/auth/change-password` | `changePassword()` | تغيير كلمة المرور           |

**Middlewares:** `validateBody`, `authRequired`

---

## 🏛️ 2. Platform Admin Controllers

> للمسؤولين عن المنصة (PLATFORM_ADMIN, PLATFORM_OWNER)

### `platform-user.controller.ts`

| Method                           | Route          | الوصف                      |
| -------------------------------- | -------------- | -------------------------- |
| `GET /api/platform/users`        | `listUsers()`  | قائمة جميع المستخدمين      |
| `GET /api/platform/users/:id`    | `getUser()`    | تفاصيل مستخدم              |
| `PATCH /api/platform/users/:id`  | `updateUser()` | تعديل مستخدم (تفعيل/تعليق) |
| `DELETE /api/platform/users/:id` | `deleteUser()` | حذف مستخدم                 |

### `platform-store.controller.ts`

| Method                            | Route                 | الوصف              |
| --------------------------------- | --------------------- | ------------------ |
| `GET /api/platform/stores`        | `listStores()`        | قائمة جميع المتاجر |
| `GET /api/platform/stores/:id`    | `getStore()`          | تفاصيل متجر        |
| `PATCH /api/platform/stores/:id`  | `updateStoreStatus()` | تغيير حالة المتجر  |
| `DELETE /api/platform/stores/:id` | `deleteStore()`       | حذف متجر           |

### `platform-subscription-plan.controller.ts`

| Method                           | Route          | الوصف           |
| -------------------------------- | -------------- | --------------- |
| `GET /api/platform/plans`        | `listPlans()`  | قائمة الخطط     |
| `POST /api/platform/plans`       | `createPlan()` | إنشاء خطة جديدة |
| `GET /api/platform/plans/:id`    | `getPlan()`    | تفاصيل خطة      |
| `PATCH /api/platform/plans/:id`  | `updatePlan()` | تعديل خطة       |
| `DELETE /api/platform/plans/:id` | `deletePlan()` | حذف خطة         |

### `platform-subscription.controller.ts`

| Method                                  | Route                  | الوصف            |
| --------------------------------------- | ---------------------- | ---------------- |
| `GET /api/platform/subscriptions`       | `listSubscriptions()`  | قائمة الاشتراكات |
| `GET /api/platform/subscriptions/:id`   | `getSubscription()`    | تفاصيل اشتراك    |
| `PATCH /api/platform/subscriptions/:id` | `updateSubscription()` | تعديل اشتراك     |

### `platform-permission.controller.ts`

| Method                                 | Route                | الوصف           |
| -------------------------------------- | -------------------- | --------------- |
| `GET /api/platform/permissions`        | `listPermissions()`  | قائمة الصلاحيات |
| `POST /api/platform/permissions`       | `createPermission()` | إنشاء صلاحية    |
| `PATCH /api/platform/permissions/:id`  | `updatePermission()` | تعديل صلاحية    |
| `DELETE /api/platform/permissions/:id` | `deletePermission()` | حذف صلاحية      |

### `platform-dashboard.controller.ts`

| Method                                      | Route               | الوصف           |
| ------------------------------------------- | ------------------- | --------------- |
| `GET /api/platform/dashboard/stats`         | `getStats()`        | إحصائيات المنصة |
| `GET /api/platform/dashboard/revenue`       | `getRevenue()`      | الإيرادات       |
| `GET /api/platform/dashboard/stores-growth` | `getStoresGrowth()` | نمو المتاجر     |

**Middlewares:** `authRequired`, `requireSystemRole([PLATFORM_ADMIN, PLATFORM_OWNER])`

---

## 🏪 3. Store Admin Controllers

> للموظفين داخل متجر معين (مدير، موظف مبيعات، إلخ)

### `store-dashboard.controller.ts`

| Method                                         | Route                  | الوصف             |
| ---------------------------------------------- | ---------------------- | ----------------- |
| `GET /api/stores/:storeId/dashboard`           | `getDashboard()`       | لوحة تحكم المتجر  |
| `GET /api/stores/:storeId/dashboard/sales`     | `getSalesStats()`      | إحصائيات المبيعات |
| `GET /api/stores/:storeId/dashboard/inventory` | `getInventoryAlerts()` | تنبيهات المخزون   |

### `store-settings.controller.ts`

| Method                                | Route              | الوصف           |
| ------------------------------------- | ------------------ | --------------- |
| `GET /api/stores/:storeId/settings`   | `getSettings()`    | إعدادات المتجر  |
| `PATCH /api/stores/:storeId/settings` | `updateSettings()` | تعديل الإعدادات |
| `POST /api/stores/:storeId/logo`      | `uploadLogo()`     | رفع الشعار      |
| `POST /api/stores/:storeId/favicon`   | `uploadFavicon()`  | رفع الأيقونة    |

### `store-member.controller.ts`

| Method                                         | Route                | الوصف                 |
| ---------------------------------------------- | -------------------- | --------------------- |
| `GET /api/stores/:storeId/members`             | `listMembers()`      | قائمة الأعضاء         |
| `POST /api/stores/:storeId/members`            | `inviteMember()`     | دعوة عضو جديد         |
| `GET /api/stores/:storeId/members/:id`         | `getMember()`        | تفاصيل عضو            |
| `PATCH /api/stores/:storeId/members/:id`       | `updateMember()`     | تعديل عضو (تغيير دور) |
| `DELETE /api/stores/:storeId/members/:id`      | `removeMember()`     | إزالة عضو             |
| `POST /api/stores/:storeId/members/:id/resend` | `resendInvitation()` | إعادة إرسال الدعوة    |

### `store-role.controller.ts`

| Method                                           | Route                     | الوصف               |
| ------------------------------------------------ | ------------------------- | ------------------- |
| `GET /api/stores/:storeId/roles`                 | `listRoles()`             | قائمة الأدوار       |
| `POST /api/stores/:storeId/roles`                | `createRole()`            | إنشاء دور جديد      |
| `GET /api/stores/:storeId/roles/:id`             | `getRole()`               | تفاصيل دور          |
| `PATCH /api/stores/:storeId/roles/:id`           | `updateRole()`            | تعديل دور           |
| `DELETE /api/stores/:storeId/roles/:id`          | `deleteRole()`            | حذف دور             |
| `PUT /api/stores/:storeId/roles/:id/permissions` | `updateRolePermissions()` | تحديث صلاحيات الدور |

### `category.controller.ts`

| Method                                          | Route                 | الوصف              |
| ----------------------------------------------- | --------------------- | ------------------ |
| `GET /api/stores/:storeId/categories`           | `listCategories()`    | قائمة الفئات       |
| `POST /api/stores/:storeId/categories`          | `createCategory()`    | إنشاء فئة          |
| `GET /api/stores/:storeId/categories/:id`       | `getCategory()`       | تفاصيل فئة         |
| `PATCH /api/stores/:storeId/categories/:id`     | `updateCategory()`    | تعديل فئة          |
| `DELETE /api/stores/:storeId/categories/:id`    | `deleteCategory()`    | حذف فئة            |
| `PATCH /api/stores/:storeId/categories/reorder` | `reorderCategories()` | إعادة ترتيب الفئات |

### `product.controller.ts`

| Method                                             | Route                   | الوصف             |
| -------------------------------------------------- | ----------------------- | ----------------- |
| `GET /api/stores/:storeId/products`                | `listProducts()`        | قائمة المنتجات    |
| `POST /api/stores/:storeId/products`               | `createProduct()`       | إنشاء منتج        |
| `GET /api/stores/:storeId/products/:id`            | `getProduct()`          | تفاصيل منتج       |
| `PATCH /api/stores/:storeId/products/:id`          | `updateProduct()`       | تعديل منتج        |
| `DELETE /api/stores/:storeId/products/:id`         | `deleteProduct()`       | حذف منتج          |
| `PATCH /api/stores/:storeId/products/:id/status`   | `updateProductStatus()` | تغيير حالة المنتج |
| `POST /api/stores/:storeId/products/:id/publish`   | `publishProduct()`      | نشر/إخفاء المنتج  |
| `POST /api/stores/:storeId/products/:id/duplicate` | `duplicateProduct()`    | تكرار منتج        |

### `product-media.controller.ts`

| Method                                                         | Route            | الوصف             |
| -------------------------------------------------------------- | ---------------- | ----------------- |
| `POST /api/stores/:storeId/products/:productId/media`          | `uploadMedia()`  | رفع صورة/فيديو    |
| `PATCH /api/stores/:storeId/products/:productId/media/:id`     | `updateMedia()`  | تعديل (alt, sort) |
| `DELETE /api/stores/:storeId/products/:productId/media/:id`    | `deleteMedia()`  | حذف وسائط         |
| `PATCH /api/stores/:storeId/products/:productId/media/reorder` | `reorderMedia()` | إعادة ترتيب       |

### `product-variant.controller.ts`

| Method                                                   | Route                 | الوصف           |
| -------------------------------------------------------- | --------------------- | --------------- |
| `GET /api/stores/:storeId/products/:productId/variants`  | `listVariants()`      | قائمة المتغيرات |
| `POST /api/stores/:storeId/products/:productId/variants` | `createVariant()`     | إنشاء متغير     |
| `GET /api/stores/:storeId/variants/:id`                  | `getVariant()`        | تفاصيل متغير    |
| `PATCH /api/stores/:storeId/variants/:id`                | `updateVariant()`     | تعديل متغير     |
| `DELETE /api/stores/:storeId/variants/:id`               | `deleteVariant()`     | حذف متغير       |
| `PATCH /api/stores/:storeId/variants/:id/default`        | `setDefaultVariant()` | تعيين افتراضي   |

### `inventory.controller.ts`

| Method                                                    | Route                   | الوصف              |
| --------------------------------------------------------- | ----------------------- | ------------------ |
| `GET /api/stores/:storeId/inventory`                      | `listInventory()`       | قائمة المخزون      |
| `GET /api/stores/:storeId/inventory/low-stock`            | `getLowStock()`         | المخزون المنخفض    |
| `GET /api/stores/:storeId/inventory/:variantId`           | `getInventory()`        | تفاصيل مخزون متغير |
| `POST /api/stores/:storeId/inventory/:variantId/adjust`   | `adjustInventory()`     | تعديل المخزون      |
| `GET /api/stores/:storeId/inventory/movements`            | `listMovements()`       | حركات المخزون      |
| `GET /api/stores/:storeId/inventory/movements/:variantId` | `getVariantMovements()` | حركات متغير معين   |

### `customer.controller.ts`

| Method                                             | Route                    | الوصف          |
| -------------------------------------------------- | ------------------------ | -------------- |
| `GET /api/stores/:storeId/customers`               | `listCustomers()`        | قائمة العملاء  |
| `POST /api/stores/:storeId/customers`              | `createCustomer()`       | إنشاء عميل     |
| `GET /api/stores/:storeId/customers/:id`           | `getCustomer()`          | تفاصيل عميل    |
| `PATCH /api/stores/:storeId/customers/:id`         | `updateCustomer()`       | تعديل عميل     |
| `DELETE /api/stores/:storeId/customers/:id`        | `deleteCustomer()`       | حذف/أرشفة عميل |
| `GET /api/stores/:storeId/customers/:id/orders`    | `getCustomerOrders()`    | طلبات العميل   |
| `GET /api/stores/:storeId/customers/:id/addresses` | `getCustomerAddresses()` | عناوين العميل  |

### `customer-address.controller.ts`

| Method                                                                   | Route                 | الوصف         |
| ------------------------------------------------------------------------ | --------------------- | ------------- |
| `POST /api/stores/:storeId/customers/:customerId/addresses`              | `createAddress()`     | إضافة عنوان   |
| `PATCH /api/stores/:storeId/customers/:customerId/addresses/:id`         | `updateAddress()`     | تعديل عنوان   |
| `DELETE /api/stores/:storeId/customers/:customerId/addresses/:id`        | `deleteAddress()`     | حذف عنوان     |
| `PATCH /api/stores/:storeId/customers/:customerId/addresses/:id/default` | `setDefaultAddress()` | تعيين افتراضي |

### `coupon.controller.ts`

| Method                                        | Route               | الوصف           |
| --------------------------------------------- | ------------------- | --------------- |
| `GET /api/stores/:storeId/coupons`            | `listCoupons()`     | قائمة الكوبونات |
| `POST /api/stores/:storeId/coupons`           | `createCoupon()`    | إنشاء كوبون     |
| `GET /api/stores/:storeId/coupons/:id`        | `getCoupon()`       | تفاصيل كوبون    |
| `PATCH /api/stores/:storeId/coupons/:id`      | `updateCoupon()`    | تعديل كوبون     |
| `DELETE /api/stores/:storeId/coupons/:id`     | `deleteCoupon()`    | حذف كوبون       |
| `GET /api/stores/:storeId/coupons/:id/usages` | `getCouponUsages()` | سجل الاستخدام   |

### `order.controller.ts`

| Method                                                 | Route                   | الوصف               |
| ------------------------------------------------------ | ----------------------- | ------------------- |
| `GET /api/stores/:storeId/orders`                      | `listOrders()`          | قائمة الطلبات       |
| `GET /api/stores/:storeId/orders/:id`                  | `getOrder()`            | تفاصيل طلب          |
| `POST /api/stores/:storeId/orders`                     | `createOrder()`         | إنشاء طلب يدوي      |
| `PATCH /api/stores/:storeId/orders/:id/status`         | `updateOrderStatus()`   | تغيير حالة الطلب    |
| `PATCH /api/stores/:storeId/orders/:id/payment-status` | `updatePaymentStatus()` | تغيير حالة الدفع    |
| `POST /api/stores/:storeId/orders/:id/cancel`          | `cancelOrder()`         | إلغاء طلب           |
| `POST /api/stores/:storeId/orders/:id/notes`           | `addInternalNote()`     | إضافة ملاحظة داخلية |
| `GET /api/stores/:storeId/orders/:id/timeline`         | `getOrderTimeline()`    | سجل أحداث الطلب     |

### `order-shipment.controller.ts`

| Method                                                | Route                    | الوصف             |
| ----------------------------------------------------- | ------------------------ | ----------------- |
| `GET /api/stores/:storeId/orders/:orderId/shipments`  | `listShipments()`        | قائمة الشحنات     |
| `POST /api/stores/:storeId/orders/:orderId/shipments` | `createShipment()`       | إنشاء شحنة        |
| `GET /api/stores/:storeId/shipments/:id`              | `getShipment()`          | تفاصيل شحنة       |
| `PATCH /api/stores/:storeId/shipments/:id`            | `updateShipment()`       | تعديل شحنة        |
| `PATCH /api/stores/:storeId/shipments/:id/status`     | `updateShipmentStatus()` | تغيير حالة الشحنة |
| `POST /api/stores/:storeId/shipments/:id/tracking`    | `updateTracking()`       | تحديث رقم التتبع  |

### `payment.controller.ts`

| Method                                                          | Route             | الوصف                         |
| --------------------------------------------------------------- | ----------------- | ----------------------------- |
| `GET /api/stores/:storeId/orders/:orderId/payments`             | `listPayments()`  | معاملات الدفع                 |
| `POST /api/stores/:storeId/orders/:orderId/payments`            | `recordPayment()` | تسجيل دفع يدوي                |
| `POST /api/stores/:storeId/orders/:orderId/payments/:id/refund` | `processRefund()` | معالجة استرداد                |
| `POST /api/stores/:storeId/payments/webhook`                    | `handleWebhook()` | استقبال webhook من مزود الدفع |

### `report.controller.ts`

| Method                                       | Route                  | الوصف          |
| -------------------------------------------- | ---------------------- | -------------- |
| `GET /api/stores/:storeId/reports/sales`     | `getSalesReport()`     | تقرير المبيعات |
| `GET /api/stores/:storeId/reports/products`  | `getProductsReport()`  | تقرير المنتجات |
| `GET /api/stores/:storeId/reports/customers` | `getCustomersReport()` | تقرير العملاء  |
| `GET /api/stores/:storeId/reports/inventory` | `getInventoryReport()` | تقرير المخزون  |

**Middlewares:** `authRequired`, `tenantMiddleware`, `requirePermission('module:action')`

---

## 🛒 4. Storefront Controllers (واجهة العميل)

> للعملاء — لا يحتاجون تسجيل دخول بالضرورة

### `storefront-store.controller.ts`

| Method                                     | Route                   | الوصف                    |
| ------------------------------------------ | ----------------------- | ------------------------ |
| `GET /api/stores/:domain`                  | `getStoreByDomain()`    | بيانات المتجر (بالدومين) |
| `GET /api/stores/:domain/categories`       | `listStoreCategories()` | فئات المتجر              |
| `GET /api/stores/:domain/categories/:slug` | `getCategoryBySlug()`   | فئة مع منتجاتها          |

### `storefront-product.controller.ts`

| Method                                    | Route                 | الوصف                   |
| ----------------------------------------- | --------------------- | ----------------------- |
| `GET /api/stores/:domain/products`        | `listStoreProducts()` | قائمة المنتجات المنشورة |
| `GET /api/stores/:domain/products/:slug`  | `getProductBySlug()`  | تفاصيل منتج             |
| `GET /api/stores/:domain/products/search` | `searchProducts()`    | بحث في المنتجات         |

### `storefront-cart.controller.ts`

| Method                                       | Route                | الوصف                           |
| -------------------------------------------- | -------------------- | ------------------------------- |
| `GET /api/stores/:domain/cart`               | `getCart()`          | جلب السلة (بـ session أو token) |
| `POST /api/stores/:domain/cart/items`        | `addToCart()`        | إضافة للسلة                     |
| `PATCH /api/stores/:domain/cart/items/:id`   | `updateCartItem()`   | تعديل كمية                      |
| `DELETE /api/stores/:domain/cart/items/:id`  | `removeCartItem()`   | حذف من السلة                    |
| `POST /api/stores/:domain/cart/apply-coupon` | `applyCoupon()`      | تطبيق كوبون                     |
| `DELETE /api/stores/:domain/cart/coupon`     | `removeCoupon()`     | إزالة كوبون                     |
| `POST /api/stores/:domain/cart/checkout`     | `initiateCheckout()` | بدء الدفع                       |

### `storefront-checkout.controller.ts`

| Method                                           | Route                | الوصف           |
| ------------------------------------------------ | -------------------- | --------------- |
| `POST /api/stores/:domain/checkout`              | `createCheckout()`   | إنشاء عملية دفع |
| `GET /api/stores/:domain/checkout/:id`           | `getCheckout()`      | حالة الدفع      |
| `POST /api/stores/:domain/checkout/:id/complete` | `completeCheckout()` | إتمام الدفع     |
| `POST /api/stores/:domain/checkout/callback`     | `paymentCallback()`  | رد مزود الدفع   |

### `storefront-order.controller.ts`

| Method                                   | Route                | الوصف                             |
| ---------------------------------------- | -------------------- | --------------------------------- |
| `GET /api/stores/:domain/orders/lookup`  | `lookupOrder()`      | البحث عن طلب (بـ رقم + هاتف/بريد) |
| `GET /api/stores/:domain/orders/:number` | `getOrderByNumber()` | تفاصيل طلب (للعميل)               |

### `storefront-customer.controller.ts`

| Method                                            | Route                     | الوصف           |
| ------------------------------------------------- | ------------------------- | --------------- |
| `POST /api/stores/:domain/customers/register`     | `registerCustomer()`      | تسجيل عميل      |
| `POST /api/stores/:domain/customers/login`        | `loginCustomer()`         | تسجيل دخول عميل |
| `GET /api/stores/:domain/customers/me`            | `getCustomerProfile()`    | بيانات العميل   |
| `PATCH /api/stores/:domain/customers/me`          | `updateCustomerProfile()` | تحديث البيانات  |
| `GET /api/stores/:domain/customers/me/orders`     | `getCustomerOrders()`     | طلبات العميل    |
| `POST /api/stores/:domain/customers/me/addresses` | `addCustomerAddress()`    | إضافة عنوان     |

**Middlewares:** `optionalAuth` (للزوار), `tenantMiddleware`

---

## 🔄 5. Shared / Utility Controllers

### `upload.controller.ts`

| Method                    | Route           | الوصف        |
| ------------------------- | --------------- | ------------ |
| `POST /api/upload/image`  | `uploadImage()` | رفع صورة عام |
| `POST /api/upload/file`   | `uploadFile()`  | رفع ملف      |
| `DELETE /api/upload/:key` | `deleteFile()`  | حذف ملف      |

### `webhook.controller.ts`

| Method                                  | Route                     | الوصف             |
| --------------------------------------- | ------------------------- | ----------------- |
| `POST /api/webhooks/payment/:provider`  | `handlePaymentWebhook()`  | webhook عام للدفع |
| `POST /api/webhooks/shipment/:provider` | `handleShipmentWebhook()` | webhook عام للشحن |

### `notification.controller.ts`

| Method                              | Route                 | الوصف             |
| ----------------------------------- | --------------------- | ----------------- |
| `GET /api/notifications`            | `listNotifications()` | إشعارات المستخدم  |
| `PATCH /api/notifications/:id/read` | `markAsRead()`        | تحديد كمقروء      |
| `PATCH /api/notifications/read-all` | `markAllAsRead()`     | تحديد الكل كمقروء |

---

## 🛡️ Middlewares المطلوبة

### `auth.middleware.ts`

```typescript
// التحقق من JWT token
// إضافة req.user
```

### `tenant.middleware.ts`

```typescript
// استخراج store_id من:
// - route param (:storeId)
// - subdomain (store.platform.ly)
// - custom domain header
// التحقق من وجود المتجر ونشاطه
// إضافة req.store
```

### `rbac.middleware.ts`

```typescript
// requirePermission(permissionCode: string)
// التحقق من أن المستخدم لديه الصلاحية في هذا المتجر
// عبر StoreMembership → StoreRole → StoreRolePermission → Permission
```

### `validate.middleware.ts`

```typescript
// validateBody(schema: ZodSchema)
// validateQuery(schema: ZodSchema)
// validateParams(schema: ZodSchema)
```

---

## 📊 ملخص العدد

| الطبقة         | عدد Controllers | عدد Endpoints تقريبي |
| -------------- | --------------- | -------------------- |
| Auth           | 1               | 9                    |
| Platform Admin | 6               | 20+                  |
| Store Admin    | 16              | 80+                  |
| Storefront     | 6               | 25+                  |
| Shared         | 3               | 10+                  |
| **الإجمالي**   | **~32**         | **~150**             |

---

## 💡 نصائح تنفيذية

1. **استخدم Services Layer** — لا تضع منطق الأعمال في Controller
2. **Zod للـ Validation** — أسرع وأوثق من Joi
3. **Prisma Transactions** — لعمليات معقدة (إنشاء طلب + تحديث مخزون + سجل حركة)
4. **Rate Limiting** — خاصة على Auth و Storefront
5. **Caching** — Redis للمنتجات المنشورة والفئات
6. **Soft Delete** — لا تحذف `Product` أو `Customer` فعلياً
7. **Event Emitter** — لفصل العمليات (إرسال بريد، تحديث إحصائيات)

---

> **هذه الخارطة تغطي 100% من Models في الـ Schema.**
> يمكن تقسيمها بين فريقين: Backend (Admin APIs) و Frontend (Storefront APIs).
