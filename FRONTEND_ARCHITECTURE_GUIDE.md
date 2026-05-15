# Frontend Architecture Guide — Wasl SaaS

> المرجع النهائي لمبرمج الفرونت اند: القرارات المعمارية، الأنماط، والأمثلة.
> Stack: Next.js 15 + TypeScript + Redux Toolkit + Tailwind CSS + shadcn/ui

---

## 1. القرارات المعمارية النهائية

| القرار | الاختيار | السبب |
|--------|----------|-------|
| Framework | Next.js (App Router) | SSR + RSC + file-based routing |
| State Management | Redux Toolkit (slices + thunks) | predictable, scalable |
| Styling | Tailwind CSS + CSS Variables | utility-first + theming |
| UI Components | shadcn/ui | headless, customizable |
| Forms | React Hook Form + Zod | performance + type-safe validation |
| Tables | TanStack Table | headless, sortable, filterable |
| HTTP Client | Native fetch (wrapper) | no axios, built-in cache |
| Token Storage | In-memory variable | XSS-safe |
| Theme | next-themes + CSS Variables | dark/light + system |
| i18n | next-intl | App Router compatible |
| Architecture | Layer-Based | simple, scalable for medium teams |

---

## 2. Project Structure

```
client/
├── app/
│   │
│   ├── (auth)/                          # 🔐 صفحات المصادقة (عامة)
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/page.tsx
│   │
│   ├── (platform)/                      # 🏛️ Platform Admin — مالك المنصة
│   │   ├── layout.tsx                   #   (Sidebar: users, stores, plans, dashboard)
│   │   ├── dashboard/page.tsx           #   إحصائيات المنصة (users, stores, revenue)
│   │   ├── users/
│   │   │   ├── page.tsx                 #   قائمة المستخدمين
│   │   │   └── [id]/page.tsx            #   تفاصيل مستخدم
│   │   ├── stores/
│   │   │   ├── page.tsx                 #   قائمة المتاجر
│   │   │   └── [id]/page.tsx            #   تفاصيل متجر (تغيير حالة)
│   │   ├── plans/
│   │   │   ├── page.tsx                 #   خطط الاشتراك
│   │   │   └── [id]/page.tsx
│   │   ├── subscriptions/page.tsx       #   الاشتراكات
│   │   └── permissions/page.tsx         #   إدارة الصلاحيات
│   │
│   ├── (store-admin)/                   # 🏪 Store Admin — لوحة تحكم التاجر
│   │   ├── layout.tsx                   #   (Sidebar: products, orders, customers, settings)
│   │   ├── dashboard/page.tsx           #   إحصائيات المتجر (sales, inventory alerts)
│   │   ├── products/
│   │   │   ├── page.tsx                 #   قائمة المنتجات
│   │   │   ├── new/page.tsx             #   إنشاء منتج
│   │   │   └── [id]/
│   │   │       ├── page.tsx             #   تفاصيل/تعديل منتج
│   │   │       ├── variants/page.tsx    #   المتغيرات
│   │   │       └── media/page.tsx       #   الصور
│   │   ├── categories/
│   │   │   ├── page.tsx                 #   شجرة الفئات
│   │   │   └── [id]/page.tsx
│   │   ├── orders/
│   │   │   ├── page.tsx                 #   قائمة الطلبات
│   │   │   ├── new/page.tsx             #   إنشاء طلب يدوي
│   │   │   └── [id]/page.tsx            #   تفاصيل طلب (timeline, shipments, payments)
│   │   ├── customers/
│   │   │   ├── page.tsx                 #   قائمة العملاء
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx            #   تفاصيل عميل (orders, addresses)
│   │   ├── coupons/
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── inventory/
│   │   │   ├── page.tsx                 #   قائمة المخزون
│   │   │   ├── low-stock/page.tsx       #   المخزون المنخفض
│   │   │   └── movements/page.tsx       #   حركات المخزون
│   │   ├── members/
│   │   │   └── page.tsx                 #   أعضاء المتجر + دعوة
│   │   ├── roles/
│   │   │   ├── page.tsx                 #   الأدوار
│   │   │   └── [id]/page.tsx            #   تعديل صلاحيات الدور
│   │   └── settings/
│   │       ├── page.tsx                 #   الإعدادات العامة
│   │       ├── branding/page.tsx        #   البراندنج (لوقو، فافيكون)
│   │       ├── seo/page.tsx             #   SEO
│   │       └── contact/page.tsx         #   معلومات التواصل
│   │
│   ├── (storefront)/                    # 🛒 Storefront — واجهة العميل (المشتري)
│   │   ├── [domain]/
│   │   │   ├── layout.tsx               #   (Header + Footer المتجر)
│   │   │   ├── page.tsx                 #   الصفحة الرئيسية للمتجر
│   │   │   ├── products/
│   │   │   │   ├── page.tsx             #   قائمة المنتجات
│   │   │   │   └── [slug]/page.tsx      #   تفاصيل منتج
│   │   │   ├── categories/
│   │   │   │   └── [slug]/page.tsx      #   فئة مع منتجاتها
│   │   │   ├── cart/page.tsx            #   السلة
│   │   │   ├── checkout/page.tsx        #   الدفع
│   │   │   ├── orders/
│   │   │   │   └── lookup/page.tsx      #   البحث عن طلب (guest)
│   │   │   └── account/                 #   حساب العميل (يتطلب customer token)
│   │   │       ├── page.tsx             #   الملف الشخصي
│   │   │       ├── orders/page.tsx      #   طلباتي
│   │   │       └── addresses/page.tsx   #   عناويني
│   │
│   ├── globals.css
│   ├── layout.tsx
│   └── providers.tsx
│
├── components/
│   ├── ui/                  # shadcn components
│   ├── shared/              # reusable (Logo, Avatar, Badge, StatusBadge)
│   ├── forms/               # form components (LoginForm, ProductForm, OrderForm)
│   ├── tables/              # table components (ProductsTable, OrdersTable, UsersTable)
│   ├── layouts/
│   │   ├── PlatformSidebar.tsx    # sidebar لمالك المنصة
│   │   ├── StoreAdminSidebar.tsx  # sidebar للتاجر
│   │   ├── StorefrontHeader.tsx   # header واجهة العميل
│   │   ├── Header.tsx
│   │   └── MobileNav.tsx
│   └── feedback/            # (Toast, Modal, Skeleton, EmptyState)
│
├── lib/
│   ├── api/
│   │   ├── client.ts        # fetch wrapper
│   │   ├── endpoints.ts     # API_ENDPOINTS constant
│   │   ├── helpers.ts       # response parsing helpers
│   │   └── services/
│   │       ├── auth.service.ts
│   │       ├── product.service.ts
│   │       ├── order.service.ts
│   │       ├── category.service.ts
│   │       ├── customer.service.ts
│   │       ├── coupon.service.ts
│   │       ├── inventory.service.ts
│   │       ├── member.service.ts
│   │       ├── role.service.ts
│   │       ├── shipment.service.ts
│   │       ├── payment.service.ts
│   │       ├── upload.service.ts
│   │       ├── platform.service.ts     # Platform Admin APIs
│   │       ├── storefront.service.ts   # Storefront public APIs
│   │       └── storeSettings.service.ts
│   │
│   ├── store/
│   │   ├── store.ts         # configureStore
│   │   ├── hooks.ts         # useAppDispatch, useAppSelector
│   │   └── slices/
│   │       ├── auth.slice.ts
│   │       ├── auth.thunks.ts
│   │       ├── products.slice.ts
│   │       ├── products.thunks.ts
│   │       ├── orders.slice.ts
│   │       ├── orders.thunks.ts
│   │       ├── categories.slice.ts
│   │       ├── categories.thunks.ts
│   │       ├── customers.slice.ts
│   │       ├── customers.thunks.ts
│   │       ├── coupons.slice.ts
│   │       ├── coupons.thunks.ts
│   │       ├── inventory.slice.ts
│   │       ├── inventory.thunks.ts
│   │       ├── members.slice.ts
│   │       ├── members.thunks.ts
│   │       ├── platform.slice.ts       # Platform Admin state (users, stores, plans)
│   │       ├── platform.thunks.ts
│   │       ├── cart.slice.ts           # Storefront cart
│   │       ├── cart.thunks.ts
│   │       └── ui.slice.ts            # UI state (sidebar, modals, toasts)
│   │
│   ├── providers/
│   │   ├── ReduxProvider.tsx
│   │   ├── ThemeProvider.tsx
│   │   └── IntlProvider.tsx
│   │
│   ├── utils/
│   │   ├── cn.ts
│   │   ├── formatCurrency.ts
│   │   ├── formatDate.ts
│   │   └── permissions.ts
│   │
│   ├── constants/
│   │   ├── api.ts
│   │   ├── routes.ts
│   │   ├── storage.ts
│   │   ├── messages.ts
│   │   ├── roles.ts
│   │   └── enums.ts
│   │
│   └── validators/
│       ├── auth.schema.ts
│       ├── product.schema.ts
│       ├── order.schema.ts
│       └── checkout.schema.ts
│
├── types/
│   ├── api.types.ts
│   ├── auth.types.ts
│   ├── product.types.ts
│   ├── order.types.ts
│   ├── store.types.ts
│   └── global.types.ts
│
├── hooks/
│   ├── usePermission.ts
│   ├── useAuth.ts
│   ├── useStore.ts
│   └── usePagination.ts
│
├── middleware.ts
├── .env.local
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 2.1 الثلاث واجهات (Apps) في المشروع

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Wasl SaaS Frontend                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. 🏛️ Platform Admin Dashboard — مالك المنصة                          │
│     Route Group: (platform)/                                            │
│     API: /api/platform/*                                                │
│     Guard: system_role = PLATFORM_ADMIN | PLATFORM_OWNER                │
│     Features:                                                           │
│       • إدارة المستخدمين (تفعيل/تعليق/حذف)                             │
│       • إدارة المتاجر (موافقة/تعليق/أرشفة)                             │
│       • خطط الاشتراك (CRUD)                                             │
│       • الاشتراكات (عرض/تعديل)                                          │
│       • الصلاحيات (CRUD)                                                │
│       • Dashboard (إحصائيات المنصة، الإيرادات، نمو المتاجر)             │
│                                                                         │
│  2. 🏪 Store Admin Dashboard — التاجر وفريقه                            │
│     Route Group: (store-admin)/                                         │
│     API: /api/stores/:storeId/*                                         │
│     Guard: verifyToken + resolveStoreContext + requirePermission         │
│     Header: x-store-id required                                         │
│     Features:                                                           │
│       • Dashboard (مبيعات، تنبيهات مخزون)                               │
│       • المنتجات (CRUD + variants + options + media)                    │
│       • الفئات (CRUD + tree + reorder)                                  │
│       • الطلبات (CRUD + status machine + timeline + shipments)          │
│       • العملاء (CRUD + addresses + order history)                      │
│       • الكوبونات (CRUD + usage tracking)                               │
│       • المخزون (view + adjust + movements + low-stock alerts)          │
│       • الأعضاء (invite + change role + remove)                         │
│       • الأدوار (CRUD + permissions assignment)                         │
│       • الإعدادات (general + branding + SEO + contact)                  │
│                                                                         │
│  3. 🛒 Storefront — واجهة العميل (المشتري)                              │
│     Route Group: (storefront)/[domain]/                                 │
│     API: /api/storefront/:domain/*                                      │
│     Auth: Optional (guest + customer token)                             │
│     Session: storefront_session cookie (guest cart)                     │
│     Features:                                                           │
│       • عرض المتجر (info + categories + products)                       │
│       • تصفح المنتجات (filter + search + pagination)                    │
│       • السلة (add/update/remove + coupon)                              │
│       • Checkout (guest + authenticated)                                │
│       • حساب العميل (register + login + profile + orders + addresses)   │
│       • البحث عن طلب (guest lookup)                                     │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### كيف يتم التوجيه بين الواجهات؟

```typescript
// middleware.ts logic:
// 1. بعد Login → نشيك system_role:
//    - PLATFORM_ADMIN/PLATFORM_OWNER → redirect to /(platform)/dashboard
//    - USER → redirect to /(store-admin)/dashboard (مع اختيار المتجر)
//
// 2. Storefront → يُحدد بالـ domain في URL (لا يحتاج login)
//
// 3. Store Admin → يحتاج:
//    - access token (Authorization header)
//    - x-store-id header (أي متجر يتحكم فيه)
//    - permissions (يحددها الدور في المتجر)
```

---

```typescript
// lib/api/client.ts
import { API_BASE_URL } from "@/lib/constants/api";
import { ApiResponse } from "@/types/api.types";

// In-memory token — XSS safe, لا يُخزن في storage
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

interface FetchOptions extends Omit<RequestInit, "headers"> {
  auth?: boolean;
  storeId?: number;
  headers?: Record<string, string>;
}

export async function apiClient<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { auth = false, storeId, headers: customHeaders, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...customHeaders,
  };

  if (auth && accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  if (storeId) {
    headers["x-store-id"] = String(storeId);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
    credentials: "include", // للكوكيز (refresh token)
  });

  // Auto refresh on 401
  if (response.status === 401 && auth) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      // Retry original request with new token
      headers["Authorization"] = `Bearer ${accessToken}`;
      const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...fetchOptions,
        headers,
        credentials: "include",
      });
      return retryResponse.json();
    }
    // Refresh failed — clear token, redirect to login
    setAccessToken(null);
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  const result = await response.json();

  if (!response.ok) {
    throw result;
  }

  return result;
}

async function attemptRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = await res.json();
    setAccessToken(data.data.accessToken);
    return true;
  } catch {
    return false;
  }
}
```

---

## 4. Constants

```typescript
// lib/constants/api.ts
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    ME: "/auth/me",
    CHANGE_PASSWORD: "/auth/change-password",
    FORGOT_PASSWORD: "/auth/forgot-password",
    RESET_PASSWORD: "/auth/reset-password",
    CREATE_STORE: "/auth/stores",
  },
  STORE_ADMIN: {
    SETTINGS: "/settings",
    MEMBERS: "/members",
    ROLES: "/roles",
    CATEGORIES: "/categories",
    PRODUCTS: "/products",
    VARIANTS: "/variants",
    INVENTORY: "/inventory",
    ORDERS: "/orders",
    CUSTOMERS: "/customers",
    COUPONS: "/coupons",
    SHIPMENTS: "/shipments",
    DASHBOARD: "/dashboard",
  },
  STOREFRONT: {
    BASE: "/storefront",
    CART: "/cart",
    CHECKOUT: "/checkout",
    CUSTOMERS: "/customers",
  },
} as const;
```

```typescript
// lib/constants/routes.ts
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  REGISTER: "/register",
  DASHBOARD: "/dashboard",
  PRODUCTS: "/products",
  ORDERS: "/orders",
  CUSTOMERS: "/customers",
  SETTINGS: "/settings",
  MEMBERS: "/members",
  ROLES: "/roles",
  COUPONS: "/coupons",
  INVENTORY: "/inventory",
} as const;
```

```typescript
// lib/constants/storage.ts
export const STORAGE_KEYS = {
  THEME: "theme",
  LANGUAGE: "language",
  SIDEBAR_COLLAPSED: "sidebar_collapsed",
  CURRENT_STORE_ID: "current_store_id",
} as const;
```

```typescript
// lib/constants/enums.ts
export const ORDER_STATUS = {
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PROCESSING: "PROCESSING",
  PREPARING: "PREPARING",
  SHIPPED: "SHIPPED",
  IN_TRANSIT: "IN_TRANSIT",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELED: "CANCELED",
  RETURNED: "RETURNED",
} as const;

export const PAYMENT_STATUS = {
  UNPAID: "UNPAID",
  PENDING: "PENDING",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
} as const;

export const PRODUCT_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
} as const;
```


---

## 5. Types

```typescript
// types/api.types.ts
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: PaginationMeta;
  message?: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface ApiError {
  success: false;
  error: string | ValidationError[];
  message: string;
}

export interface ValidationError {
  code: string;
  message: string;
  path: string[];
}
```

```typescript
// types/auth.types.ts
export type SystemRole = "USER" | "SUPPORT" | "PLATFORM_ADMIN" | "PLATFORM_OWNER";

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  avatar_url: string | null;
  system_role: SystemRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface StoreContext {
  storeId: number;
  role: string;
  permissions: string[];
}
```

```typescript
// types/product.types.ts
export type ProductStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  status: ProductStatus;
  base_price: string; // Decimal comes as string
  compare_at_price: string | null;
  cost_price: string | null;
  track_inventory: boolean;
  has_variants: boolean;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  categories?: Category[];
  media?: ProductMedia[];
  variants?: ProductVariant[];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parent_id: number | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  children?: Category[];
}

export interface ProductMedia {
  id: number;
  url: string;
  alt_text: string | null;
  sort_order: number;
}

export interface ProductVariant {
  id: number;
  title: string;
  sku: string;
  barcode: string | null;
  price: string | null;
  compare_at_price: string | null;
  is_default: boolean;
  is_active: boolean;
  inventory?: {
    available_quantity: number;
    total_quantity: number;
    reserved_quantity: number;
    low_stock_threshold: number;
  };
}
```

---

## 6. Services Layer

```typescript
// lib/api/services/auth.service.ts
import { apiClient, setAccessToken } from "../client";
import { API_ENDPOINTS } from "@/lib/constants/api";
import { AuthResponse, LoginPayload, RegisterPayload, User } from "@/types/auth.types";
import { ApiResponse } from "@/types/api.types";

export const authService = {
  async login(payload: LoginPayload): Promise<AuthResponse> {
    const res = await apiClient<{ user: User; accessToken: string }>(
      API_ENDPOINTS.AUTH.LOGIN,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    const res = await apiClient<{ user: User; accessToken: string }>(
      API_ENDPOINTS.AUTH.REGISTER,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
    setAccessToken(res.data.accessToken);
    return res.data;
  },

  async logout(): Promise<void> {
    await apiClient(API_ENDPOINTS.AUTH.LOGOUT, {
      method: "POST",
      auth: true,
    });
    setAccessToken(null);
  },

  async getProfile(): Promise<User> {
    const res = await apiClient<{ user: User }>(API_ENDPOINTS.AUTH.ME, {
      auth: true,
    });
    return res.data.user;
  },

  async refresh(): Promise<string | null> {
    try {
      const res = await apiClient<{ accessToken: string }>(
        API_ENDPOINTS.AUTH.REFRESH,
        { method: "POST" }
      );
      setAccessToken(res.data.accessToken);
      return res.data.accessToken;
    } catch {
      return null;
    }
  },
};
```

```typescript
// lib/api/services/product.service.ts
import { apiClient } from "../client";
import { API_ENDPOINTS } from "@/lib/constants/api";
import { Product } from "@/types/product.types";
import { PaginatedResponse, PaginationParams } from "@/types/api.types";

export const productService = {
  async getAll(
    storeId: number,
    params: PaginationParams & { status?: string; category_id?: number }
  ): Promise<PaginatedResponse<Product>> {
    const query = new URLSearchParams({
      page: String(params.page),
      limit: String(params.limit),
      ...(params.sortBy && { sortBy: params.sortBy }),
      ...(params.sortOrder && { sortOrder: params.sortOrder }),
      ...(params.status && { status: params.status }),
      ...(params.category_id && { category_id: String(params.category_id) }),
    });

    return apiClient<Product[]>(
      `/stores/${storeId}${API_ENDPOINTS.STORE_ADMIN.PRODUCTS}?${query}`,
      { auth: true, storeId }
    ) as unknown as PaginatedResponse<Product>;
  },

  async getById(storeId: number, productId: number): Promise<Product> {
    const res = await apiClient<{ product: Product }>(
      `/stores/${storeId}${API_ENDPOINTS.STORE_ADMIN.PRODUCTS}/${productId}`,
      { auth: true, storeId }
    );
    return res.data.product;
  },

  async create(storeId: number, data: Partial<Product>): Promise<Product> {
    const res = await apiClient<{ product: Product }>(
      `/stores/${storeId}${API_ENDPOINTS.STORE_ADMIN.PRODUCTS}`,
      {
        method: "POST",
        auth: true,
        storeId,
        body: JSON.stringify(data),
      }
    );
    return res.data.product;
  },

  async update(storeId: number, productId: number, data: Partial<Product>): Promise<Product> {
    const res = await apiClient<{ product: Product }>(
      `/stores/${storeId}${API_ENDPOINTS.STORE_ADMIN.PRODUCTS}/${productId}`,
      {
        method: "PATCH",
        auth: true,
        storeId,
        body: JSON.stringify(data),
      }
    );
    return res.data.product;
  },

  async delete(storeId: number, productId: number): Promise<void> {
    await apiClient(
      `/stores/${storeId}${API_ENDPOINTS.STORE_ADMIN.PRODUCTS}/${productId}`,
      { method: "DELETE", auth: true, storeId }
    );
  },
};
```

---

## 7. Redux — Slices + Thunks (منفصلة)

```typescript
// lib/store/store.ts
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/auth.slice";
import productsReducer from "./slices/products.slice";
import ordersReducer from "./slices/orders.slice";
import categoriesReducer from "./slices/categories.slice";
import customersReducer from "./slices/customers.slice";
import couponsReducer from "./slices/coupons.slice";
import inventoryReducer from "./slices/inventory.slice";
import membersReducer from "./slices/members.slice";
import platformReducer from "./slices/platform.slice";
import cartReducer from "./slices/cart.slice";
import uiReducer from "./slices/ui.slice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    orders: ordersReducer,
    categories: categoriesReducer,
    customers: customersReducer,
    coupons: couponsReducer,
    inventory: inventoryReducer,
    members: membersReducer,
    platform: platformReducer,   // Platform Admin (users, stores, plans)
    cart: cartReducer,           // Storefront cart
    ui: uiReducer,               // UI state (sidebar, modals)
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

```typescript
// lib/store/hooks.ts
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "./store";

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
```

```typescript
// lib/store/slices/auth.thunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { authService } from "@/lib/api/services/auth.service";
import { LoginPayload, RegisterPayload } from "@/types/auth.types";

export const loginThunk = createAsyncThunk(
  "auth/login",
  async (payload: LoginPayload, { rejectWithValue }) => {
    try {
      return await authService.login(payload);
    } catch (error: unknown) {
      if (error && typeof error === "object" && "message" in error) {
        return rejectWithValue((error as { message: string }).message);
      }
      return rejectWithValue("Login failed");
    }
  }
);

export const registerThunk = createAsyncThunk(
  "auth/register",
  async (payload: RegisterPayload, { rejectWithValue }) => {
    try {
      return await authService.register(payload);
    } catch (error: unknown) {
      if (error && typeof error === "object" && "message" in error) {
        return rejectWithValue((error as { message: string }).message);
      }
      return rejectWithValue("Registration failed");
    }
  }
);

export const logoutThunk = createAsyncThunk("auth/logout", async () => {
  await authService.logout();
});

export const fetchProfileThunk = createAsyncThunk(
  "auth/fetchProfile",
  async (_, { rejectWithValue }) => {
    try {
      return await authService.getProfile();
    } catch (error: unknown) {
      if (error && typeof error === "object" && "message" in error) {
        return rejectWithValue((error as { message: string }).message);
      }
      return rejectWithValue("Failed to fetch profile");
    }
  }
);
```

```typescript
// lib/store/slices/auth.slice.ts
import { createSlice } from "@reduxjs/toolkit";
import { User } from "@/types/auth.types";
import { loginThunk, registerThunk, logoutThunk, fetchProfileThunk } from "./auth.thunks";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  permissions: string[];
  currentStoreId: number | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  permissions: [],
  currentStoreId: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null;
    },
    setCurrentStore(state, action) {
      state.currentStoreId = action.payload.storeId;
      state.permissions = action.payload.permissions;
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Register
    builder
      .addCase(registerThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Logout
    builder.addCase(logoutThunk.fulfilled, (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.permissions = [];
      state.currentStoreId = null;
    });

    // Fetch Profile
    builder
      .addCase(fetchProfileThunk.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchProfileThunk.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setCurrentStore } = authSlice.actions;
export default authSlice.reducer;

// Selectors
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading;
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error;
export const selectPermissions = (state: { auth: AuthState }) => state.auth.permissions;
export const selectCurrentStoreId = (state: { auth: AuthState }) => state.auth.currentStoreId;
```

```typescript
// lib/store/slices/products.thunks.ts
import { createAsyncThunk } from "@reduxjs/toolkit";
import { productService } from "@/lib/api/services/product.service";
import { PaginationParams } from "@/types/api.types";
import { RootState } from "../store";

export const fetchProductsThunk = createAsyncThunk(
  "products/fetchAll",
  async (params: PaginationParams & { status?: string }, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const storeId = state.auth.currentStoreId;
      if (!storeId) throw new Error("No store selected");
      return await productService.getAll(storeId, params);
    } catch (error: unknown) {
      if (error && typeof error === "object" && "message" in error) {
        return rejectWithValue((error as { message: string }).message);
      }
      return rejectWithValue("Failed to fetch products");
    }
  }
);

export const deleteProductThunk = createAsyncThunk(
  "products/delete",
  async (productId: number, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const storeId = state.auth.currentStoreId;
      if (!storeId) throw new Error("No store selected");
      await productService.delete(storeId, productId);
      return productId;
    } catch (error: unknown) {
      if (error && typeof error === "object" && "message" in error) {
        return rejectWithValue((error as { message: string }).message);
      }
      return rejectWithValue("Failed to delete product");
    }
  }
);
```

```typescript
// lib/store/slices/products.slice.ts
import { createSlice } from "@reduxjs/toolkit";
import { Product } from "@/types/product.types";
import { PaginationMeta } from "@/types/api.types";
import { fetchProductsThunk, deleteProductThunk } from "./products.thunks";

interface ProductsState {
  items: Product[];
  meta: PaginationMeta | null;
  loading: boolean;
  error: string | null;
}

const initialState: ProductsState = {
  items: [],
  meta: null,
  loading: false,
  error: null,
};

const productsSlice = createSlice({
  name: "products",
  initialState,
  reducers: {
    clearProducts(state) {
      state.items = [];
      state.meta = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProductsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.data;
        state.meta = action.payload.meta;
      })
      .addCase(fetchProductsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder.addCase(deleteProductThunk.fulfilled, (state, action) => {
      state.items = state.items.filter((p) => p.id !== action.payload);
    });
  },
});

export const { clearProducts } = productsSlice.actions;
export default productsSlice.reducer;

// Selectors
export const selectProducts = (state: { products: ProductsState }) => state.products.items;
export const selectProductsMeta = (state: { products: ProductsState }) => state.products.meta;
export const selectProductsLoading = (state: { products: ProductsState }) => state.products.loading;
```


---

## 8. Hooks

```typescript
// hooks/usePermission.ts
import { useAppSelector } from "@/lib/store/hooks";
import { selectPermissions } from "@/lib/store/slices/auth.slice";

export function usePermission(permission: string): boolean {
  const permissions = useAppSelector(selectPermissions);
  return permissions.includes(permission);
}

export function usePermissions(requiredPermissions: string[]): boolean {
  const permissions = useAppSelector(selectPermissions);
  return requiredPermissions.every((p) => permissions.includes(p));
}
```

```typescript
// hooks/useAuth.ts
import { useAppSelector } from "@/lib/store/hooks";
import { selectUser, selectIsAuthenticated, selectAuthLoading } from "@/lib/store/slices/auth.slice";

export function useAuth() {
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const loading = useAppSelector(selectAuthLoading);

  return { user, isAuthenticated, loading };
}
```

---

## 9. Providers

```typescript
// lib/providers/ReduxProvider.tsx
"use client";

import { Provider } from "react-redux";
import { store } from "@/lib/store/store";

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
```

```typescript
// lib/providers/ThemeProvider.tsx
"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
```

```typescript
// app/providers.tsx
"use client";

import { ReduxProvider } from "@/lib/providers/ReduxProvider";
import { ThemeProvider } from "@/lib/providers/ThemeProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ReduxProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </ReduxProvider>
  );
}
```

---

## 10. Design System (CSS Variables + Tailwind)

```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 255 255 255;
    --foreground: 10 10 10;

    --primary: 59 130 246;
    --primary-foreground: 255 255 255;

    --secondary: 244 244 245;
    --secondary-foreground: 24 24 27;

    --muted: 244 244 245;
    --muted-foreground: 113 113 122;

    --accent: 244 244 245;
    --accent-foreground: 24 24 27;

    --destructive: 239 68 68;
    --destructive-foreground: 255 255 255;

    --border: 228 228 231;
    --input: 228 228 231;
    --ring: 59 130 246;

    --radius: 0.75rem;
  }

  .dark {
    --background: 10 10 10;
    --foreground: 250 250 250;

    --primary: 96 165 250;
    --primary-foreground: 0 0 0;

    --secondary: 39 39 42;
    --secondary-foreground: 250 250 250;

    --muted: 39 39 42;
    --muted-foreground: 161 161 170;

    --accent: 39 39 42;
    --accent-foreground: 250 250 250;

    --destructive: 239 68 68;
    --destructive-foreground: 255 255 255;

    --border: 39 39 42;
    --input: 39 39 42;
    --ring: 96 165 250;
  }
}
```

```typescript
// tailwind.config.ts (colors section)
colors: {
  background: "rgb(var(--background) / <alpha-value>)",
  foreground: "rgb(var(--foreground) / <alpha-value>)",
  primary: {
    DEFAULT: "rgb(var(--primary) / <alpha-value>)",
    foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
  },
  secondary: {
    DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
    foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
  },
  muted: {
    DEFAULT: "rgb(var(--muted) / <alpha-value>)",
    foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
  },
  destructive: {
    DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
    foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
  },
  border: "rgb(var(--border) / <alpha-value>)",
  input: "rgb(var(--input) / <alpha-value>)",
  ring: "rgb(var(--ring) / <alpha-value>)",
},
borderRadius: {
  lg: "var(--radius)",
  md: "calc(var(--radius) - 2px)",
  sm: "calc(var(--radius) - 4px)",
},
```

---

## 11. Middleware (Route Protection)

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];
const AUTH_PATHS = ["/login", "/register"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for refresh token cookie (indicates user might be authenticated)
  const hasRefreshToken = request.cookies.has("refresh_token");

  // If user has token and tries to access auth pages, redirect to dashboard
  if (AUTH_PATHS.some((path) => pathname.startsWith(path)) && hasRefreshToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user has no token and tries to access protected pages, redirect to login
  if (!PUBLIC_PATHS.some((path) => pathname.startsWith(path)) && !hasRefreshToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|uploads).*)"],
};
```

---

## 12. Validators (Zod + React Hook Form)

```typescript
// lib/validators/auth.schema.ts
import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().min(3, "الحقل مطلوب"),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب").max(100),
  email: z.string().email("إيميل غير صالح"),
  phone: z.string().regex(/^\+?\d{7,15}$/, "رقم هاتف غير صالح"),
  password: z.string().min(8, "كلمة المرور 8 أحرف على الأقل").max(128),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
```

```typescript
// Usage in component with React Hook Form
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginFormData } from "@/lib/validators/auth.schema";
import { useAppDispatch } from "@/lib/store/hooks";
import { loginThunk } from "@/lib/store/slices/auth.thunks";

export function LoginForm() {
  const dispatch = useAppDispatch();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    dispatch(loginThunk(data));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("identifier")} />
      {errors.identifier && <span>{errors.identifier.message}</span>}

      <input type="password" {...register("password")} />
      {errors.password && <span>{errors.password.message}</span>}

      <button type="submit">دخول</button>
    </form>
  );
}
```

---

## 13. Error Handling Pattern

```typescript
// lib/utils/handleApiError.ts
import { ApiError, ValidationError } from "@/types/api.types";

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "success" in error &&
    (error as ApiError).success === false
  );
}

export function getValidationErrors(error: ApiError): Record<string, string> {
  if (!Array.isArray(error.error)) return {};

  const fieldErrors: Record<string, string> = {};
  (error.error as ValidationError[]).forEach((issue) => {
    const field = issue.path[0];
    if (field) fieldErrors[field] = issue.message;
  });
  return fieldErrors;
}

export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message || "حدث خطأ";
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "حدث خطأ غير متوقع";
}
```

---

## 14. Server vs Client Components

```
القاعدة:
- كل شيء Server Component إلا اللي يحتاج interactivity
- Pages = Server Components (تجلب البيانات)
- Interactive parts = Client Components (forms, tables, modals)
```

```typescript
// app/(dashboard)/products/page.tsx — Server Component
import { ProductsPageClient } from "./ProductsPageClient";

export default function ProductsPage() {
  // هذي Server Component — ممكن تجلب بيانات هنا لو تبغي SSR
  return <ProductsPageClient />;
}
```

```typescript
// app/(dashboard)/products/ProductsPageClient.tsx — Client Component
"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { fetchProductsThunk } from "@/lib/store/slices/products.thunks";
import { selectProducts, selectProductsLoading } from "@/lib/store/slices/products.slice";
import { ProductsTable } from "@/components/tables/ProductsTable";

export function ProductsPageClient() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);
  const loading = useAppSelector(selectProductsLoading);

  useEffect(() => {
    dispatch(fetchProductsThunk({ page: 1, limit: 20 }));
  }, [dispatch]);

  if (loading) return <Skeleton />;

  return <ProductsTable data={products} />;
}
```

---

## 15. Messages (i18n-ready)

```typescript
// lib/constants/messages.ts
export const MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: { ar: "تم تسجيل الدخول", en: "Login successful" },
    LOGIN_FAILED: { ar: "بيانات الدخول غير صحيحة", en: "Invalid credentials" },
    REGISTER_SUCCESS: { ar: "تم إنشاء الحساب", en: "Account created" },
    LOGOUT_SUCCESS: { ar: "تم تسجيل الخروج", en: "Logged out" },
    SESSION_EXPIRED: { ar: "انتهت الجلسة، سجل دخول مرة أخرى", en: "Session expired" },
  },
  PRODUCTS: {
    CREATED: { ar: "تم إنشاء المنتج", en: "Product created" },
    UPDATED: { ar: "تم تحديث المنتج", en: "Product updated" },
    DELETED: { ar: "تم حذف المنتج", en: "Product deleted" },
    FETCH_ERROR: { ar: "فشل في جلب المنتجات", en: "Failed to fetch products" },
  },
  ORDERS: {
    STATUS_UPDATED: { ar: "تم تحديث حالة الطلب", en: "Order status updated" },
    CANCELED: { ar: "تم إلغاء الطلب", en: "Order canceled" },
  },
  GENERAL: {
    NETWORK_ERROR: { ar: "خطأ في الاتصال", en: "Network error" },
    RATE_LIMITED: { ar: "طلبات كثيرة، حاول لاحقاً", en: "Too many requests" },
    FORBIDDEN: { ar: "ليس لديك صلاحية", en: "Access denied" },
  },
} as const;
```

---

## 16. Stack النهائي

| الأداة | الإصدار | الاستخدام |
|--------|---------|-----------|
| Next.js | 15+ | Framework |
| TypeScript | 5+ | Type safety |
| Redux Toolkit | 2+ | State management |
| Tailwind CSS | 4+ | Styling |
| shadcn/ui | latest | UI components |
| Zod | 4+ | Validation |
| React Hook Form | 7+ | Forms |
| next-themes | 0.4+ | Dark/Light mode |
| next-intl | 3+ | i18n (ar/en) |
| TanStack Table | 8+ | Data tables |

---

## 17. ملاحظات مهمة

1. **لا تستخدم `any`** — دائماً `unknown` + type narrowing
2. **لا تضع business logic في components** — كل شيء في services + thunks
3. **لا تكرر strings** — استخدم constants
4. **لا تستخدم localStorage للتوكن** — in-memory فقط
5. **Refresh token في httpOnly cookie** — الباكند يتعامل معه
6. **كل page تكون Server Component** — Client فقط للـ interactive parts
7. **Error Boundaries** — أضف `error.tsx` لكل route group
8. **Loading States** — أضف `loading.tsx` لكل route group
9. **الأسعار تجي كـ string** (Decimal) — حولها بـ `parseFloat()` عند العرض
10. **التواريخ بصيغة ISO** — استخدم `formatDate()` utility

---

> آخر تحديث: مايو 2026
