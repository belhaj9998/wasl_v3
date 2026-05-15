# Implementation Plan: Wasl SaaS Frontend

## Overview

This plan implements the Wasl SaaS Frontend — a comprehensive multi-tenant e-commerce platform built with Next.js 15 App Router, TypeScript, Redux Toolkit, Tailwind CSS, and shadcn/ui. The implementation is organized in phases: project setup and core infrastructure, then the three interfaces (Platform Admin, Store Admin, Storefront) with shared components built incrementally.

## Tasks

- [x] 1. Project Setup and Core Infrastructure
  - [x] 1.1 Initialize Next.js 15 project with TypeScript, Tailwind CSS, and configure `tsconfig.json`, `tailwind.config.ts`, `next.config.js`, and `.env.local`
    - Install dependencies: next, react, react-dom, typescript, tailwindcss, @reduxjs/toolkit, react-redux, zod, react-hook-form, @hookform/resolvers, @tanstack/react-table, next-themes, next-intl, lucide-react, clsx, tailwind-merge, date-fns, sonner
    - Install dev dependencies: vitest, @testing-library/react, fast-check, playwright
    - Configure Tailwind with RTL support and CSS variables for theming
    - Set up `NEXT_PUBLIC_API_URL` environment variable
    - _Requirements: 23.7, 24.1_

  - [x] 1.2 Create TypeScript type definitions (`types/`)
    - Create `types/api.types.ts` with ApiResponse, PaginatedResponse, PaginationMeta, PaginationParams, ApiError, ValidationError interfaces
    - Create `types/auth.types.ts` with User, SystemRole, LoginPayload, RegisterPayload, AuthResponse, StoreContext interfaces
    - Create `types/product.types.ts` with Product, ProductStatus, ProductVariant, ProductOption, OptionValue, ProductMedia, Category interfaces
    - Create `types/order.types.ts` with Order, OrderStatus, OrderItem, PaymentStatus, PaymentMethod, OrderSource, OrderNote, TimelineEvent, Address interfaces
    - Create `types/store.types.ts` with Store, StoreStatus, Plan, Subscription, SubscriptionStatus, BillingCycle, Coupon, Customer, CustomerStatus, InventoryLevel, InventoryMovement interfaces
    - Create `types/global.types.ts` with Cart, CartItem, AppliedCoupon, SidebarItem, Toast interfaces
    - _Requirements: 26.6, 27.1_

  - [x] 1.3 Create constants and enums (`lib/constants/`)
    - Create `lib/constants/api.ts` with API_BASE_URL and API_ENDPOINTS object
    - Create `lib/constants/routes.ts` with ROUTES object for all navigation paths
    - Create `lib/constants/storage.ts` with STORAGE_KEYS (THEME, LANGUAGE, SIDEBAR_COLLAPSED, CURRENT_STORE_ID)
    - Create `lib/constants/enums.ts` with ORDER_STATUS, PAYMENT_STATUS, PRODUCT_STATUS, ORDER_STATUS_TRANSITIONS, STORE_STATUS_TRANSITIONS, ORDER_STATUS_LABELS
    - Create `lib/constants/messages.ts` with localized error/success message keys
    - _Requirements: 9.2, 4.3, 23.4_

  - [x] 1.4 Create utility functions (`lib/utils/`)
    - Create `lib/utils/cn.ts` with clsx + tailwind-merge utility
    - Create `lib/utils/formatCurrency.ts` for Libyan Dinar formatting
    - Create `lib/utils/formatDate.ts` with date-fns formatting helpers
    - Create `lib/utils/permissions.ts` with `buildSidebarItems`, `canPerformAction`, `buildCategoryTree`, `canTransitionTo`, `getAvailableTransitions`, `getOrderActions` functions
    - _Requirements: 15.2, 9.2, 8.1, 4.3_


  - [x]* 1.5 Write property tests for utility functions
    - **Property 5: Order Status Machine Validity** — For any order status, `getAvailableTransitions(status)` returns only statuses in `ORDER_STATUS_TRANSITIONS[status]`. Terminal states return empty array. `canTransitionTo(current, target)` returns true iff target ∈ transitions[current].
    - **Property 6: Store Status Machine Validity** — For any store status, available transitions match `STORE_STATUS_TRANSITIONS[status]` exactly.
    - **Property 8: Category Tree Completeness** — For any flat category array, `buildCategoryTree` produces a tree where every input category appears exactly once, sorted by sort_order, with orphans as roots.
    - **Property 4: Sidebar Permission Filtering** — For any permissions array, `buildSidebarItems(permissions)` returns only items whose permission is in the array.
    - **Validates: Requirements 9.2, 9.3, 4.2, 4.3, 8.1, 8.4, 15.2**

- [x] 2. API Client and Authentication Layer
  - [x] 2.1 Implement the API client (`lib/api/client.ts`)
    - Create `apiClient<T>` function wrapping native fetch with typed responses
    - Implement in-memory token storage with `setAccessToken`/`getAccessToken`/`setCustomerToken`/`getCustomerToken`
    - Implement auto-refresh on 401 with single retry guard (`_isRetry` flag)
    - Implement `x-store-id` header attachment when `storeId` provided
    - Implement `credentials: "include"` on all requests
    - Set `Content-Type: application/json` by default with override support
    - Redirect to `/login` on refresh failure
    - _Requirements: 1.4, 1.5, 1.6, 26.1, 26.2, 26.3, 26.4, 26.5, 26.6, 26.7_

  - [x]* 2.2 Write property tests for API client
    - **Property 1: Token Refresh Idempotency** — For any request receiving 401, refresh fires at most once and original request retried at most once.
    - **Property 9: Store Context Header Attachment** — For any request with storeId, headers contain `x-store-id` matching String(storeId).
    - **Property 10: API Client Credentials Inclusion** — All requests include `credentials: "include"`.
    - **Validates: Requirements 1.4, 26.2, 26.3, 26.4**

  - [x] 2.3 Create API service modules (`lib/api/services/`)
    - Create `auth.service.ts` with login, register, logout, getProfile, refresh, changePassword, forgotPassword, resetPassword, createStore methods
    - Create `product.service.ts` with getAll, getById, create, update, delete, changeStatus, publish, duplicate methods
    - Create `order.service.ts` with getAll, getById, create, updateStatus, cancel, addNote, getTimeline methods
    - Create `category.service.ts` with getAll, getById, create, update, delete, reorder methods
    - Create `customer.service.ts` with getAll, getById, create, update, delete, getOrders, getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress methods
    - Create `coupon.service.ts` with getAll, getById, create, update, delete, getUsages, validate methods
    - Create `inventory.service.ts` with getAll, getLowStock, getMovements, getByVariant, adjust, getVariantMovements methods
    - Create `member.service.ts` with getAll, getById, invite, changeRole, remove, resendInvite methods
    - Create `role.service.ts` with getAll, getById, create, update, delete, updatePermissions methods
    - Create `platform.service.ts` with users (getAll, getById, update, delete), stores (getAll, getById, updateStatus, delete), plans (getAll, getById, create, update, delete), subscriptions (getAll, getById, update), permissions (getAll, create, update, delete), dashboard (getStats, getRevenue, getGrowth) methods
    - Create `storefront.service.ts` with getStore, getCategories, getCategoryBySlug, getProducts, searchProducts, getProductBySlug, getCart, addToCart, updateCartItem, removeCartItem, applyCoupon, removeCoupon, checkout, orderLookup, customerRegister, customerLogin, getCustomerProfile, updateCustomerProfile, getCustomerOrders, getCustomerAddresses, addCustomerAddress, updateCustomerAddress, deleteCustomerAddress, setDefaultAddress methods
    - Create `upload.service.ts` with uploadImage, uploadFile, deleteFile methods
    - Create `storeSettings.service.ts` with getSettings, updateGeneral, updateBranding, updateSeo, updateContact methods
    - _Requirements: 1.1, 1.2, 3.1, 4.1, 5.1, 7.1, 8.1, 9.1, 10.1, 11.1, 12.1, 13.1, 14.1, 16.1, 17.1, 18.1, 19.1, 20.1_

  - [x] 2.4 Create Zod validation schemas (`lib/validators/`)
    - Create `auth.schema.ts` with loginSchema (identifier: non-empty, password: 1-128 chars), registerSchema (name: 2-100, email: valid, phone: +?[0-9]{7,15}, password: 8-128)
    - Create `product.schema.ts` with productSchema (name: 2-200, base_price: positive decimal max 2 decimals, slug: store-unique pattern)
    - Create `order.schema.ts` with manualOrderSchema (items: 1-100, quantity: 1-9999, shipping address validation)
    - Create `checkout.schema.ts` with checkoutSchema (customer_name: 2-100, customer_phone: +218XXXXXXXXX, shipping_address, payment_method)
    - Create `coupon.schema.ts` with couponSchema (code: 2-50, type, value, dates validation)
    - Create `customer.schema.ts` with customerSchema (first_name, email/phone required, notes: max 1000)
    - Create `category.schema.ts` with categorySchema (name: 1-100, slug auto-gen)
    - Create `settings.schema.ts` with generalSchema (name: 2-100, domain: 3-63), seoSchema (meta_title: max 70, meta_description: max 160), contactSchema
    - Create `member.schema.ts` with inviteSchema (email: valid RFC 5322 max 254, role_id required)
    - Create `role.schema.ts` with roleSchema (name: 2-50, description: max 255)
    - Create `plan.schema.ts` with planSchema (code: 1-50 lowercase alphanumeric/hyphens, name: 1-100, price_monthly: 0.01-999999.99)
    - Create `inventory.schema.ts` with adjustmentSchema (type: IN/ADJUSTMENT_IN/OUT/ADJUSTMENT_OUT, quantity_change: 1-99999, reason: max 500)
    - _Requirements: 1.1, 1.2, 7.2, 9.4, 10.3, 11.1, 12.3, 13.1, 13.4, 14.1, 14.4, 14.5, 18.1, 21.1_

- [x] 3. Redux Store and State Management
  - [x] 3.1 Configure Redux store and providers
    - Create `lib/store/store.ts` with configureStore combining all slice reducers
    - Create `lib/store/hooks.ts` with typed useAppDispatch and useAppSelector
    - Create `lib/providers/ReduxProvider.tsx` wrapping children with Provider
    - Create `lib/providers/ThemeProvider.tsx` using next-themes
    - Create `lib/providers/IntlProvider.tsx` using next-intl
    - Create `app/providers.tsx` composing all providers
    - _Requirements: 27.1, 27.4, 24.1, 23.1_

  - [x] 3.2 Implement auth slice and thunks
    - Create `lib/store/slices/auth.slice.ts` with AuthState (user, isAuthenticated, loading, error, permissions, currentStoreId)
    - Create `lib/store/slices/auth.thunks.ts` with loginThunk, registerThunk, logoutThunk, fetchProfileThunk, setCurrentStoreThunk (fetches permissions, persists to localStorage)
    - Implement setCurrentStore reducer that updates currentStoreId and permissions
    - Implement store switch logic: reset other slices, update currentStoreId, fetch new permissions
    - Implement localStorage persistence for currentStoreId on init
    - _Requirements: 1.1, 1.2, 1.3, 1.9, 1.10, 1.11, 6.1, 6.2, 6.6, 6.7, 27.2, 27.3_

  - [x]* 3.3 Write property tests for auth state
    - **Property 2: Auth State Consistency** — If isAuthenticated === true then user !== null. After logout: isAuthenticated === false AND user === null AND permissions === [] AND currentStoreId === null.
    - **Property 15: Thunk Loading State Transitions** — For any async thunk dispatch, loading transitions from false→true on pending, then back to false on fulfilled/rejected. On rejection, error contains the message.
    - **Validates: Requirements 1.3, 27.2, 27.3**

  - [x] 3.4 Implement domain slices (products, orders, categories, customers, coupons, inventory, members, platform, ui)
    - Create `products.slice.ts` + `products.thunks.ts` with items, currentProduct, meta, loading, error state
    - Create `orders.slice.ts` + `orders.thunks.ts` with items, currentOrder, meta, loading, error state
    - Create `categories.slice.ts` + `categories.thunks.ts` with items (tree), loading, error state
    - Create `customers.slice.ts` + `customers.thunks.ts` with items, currentCustomer, meta, loading, error state
    - Create `coupons.slice.ts` + `coupons.thunks.ts` with items, currentCoupon, meta, loading, error state
    - Create `inventory.slice.ts` + `inventory.thunks.ts` with items, movements, lowStock, meta, loading, error state
    - Create `members.slice.ts` + `members.thunks.ts` with items, loading, error state
    - Create `platform.slice.ts` + `platform.thunks.ts` with users, stores, plans, subscriptions, stats sub-states
    - Create `ui.slice.ts` with sidebarCollapsed, activeModal, toasts, locale, direction state
    - _Requirements: 27.1, 27.2, 27.3_

  - [x] 3.5 Implement cart slice with optimistic updates
    - Create `cart.slice.ts` with items, subtotal, discount, total, coupon, loading state
    - Create `cart.thunks.ts` with addToCartThunk, updateCartItemThunk, removeCartItemThunk, applyCouponThunk, removeCouponThunk
    - Implement optimistic update pattern: snapshot state before dispatch, rollback on rejection
    - Implement `addItemOptimistic`, `removeItemOptimistic`, `updateQuantityOptimistic`, `setCart` reducers
    - _Requirements: 17.1, 17.2, 17.3, 17.6, 17.7, 27.5_

  - [x]* 3.6 Write property tests for cart optimistic rollback
    - **Property 7: Cart Optimistic Rollback** — For any cart operation that fails, cart state after failure equals cart state before the operation.
    - **Validates: Requirement 17.2**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [x] 5. Shared UI Components and Layout System
  - [x] 5.1 Set up shadcn/ui and create base UI components (`components/ui/`)
    - Initialize shadcn/ui with Tailwind CSS variables and RTL support
    - Add components: Button, Input, Label, Card, Dialog, DropdownMenu, Select, Textarea, Badge, Skeleton, Separator, Sheet, Tabs, Tooltip, Avatar, Checkbox, Switch, Table, Pagination
    - Configure dark/light theme CSS variables in `globals.css`
    - _Requirements: 24.1, 23.7_

  - [x] 5.2 Create shared components (`components/shared/`)
    - Create `StatusBadge` component for order/product/store status display with color coding
    - Create `Logo` component with responsive sizing
    - Create `EmptyState` component with icon and message
    - Create `LoadingSkeleton` component for table rows
    - Create `ConfirmDialog` component for delete confirmations
    - Create `Toast` integration using sonner with RTL support
    - _Requirements: 22.3, 22.4, 22.7, 25.3, 25.4_

  - [x] 5.3 Create form components (`components/forms/`)
    - Create `FormField` wrapper component integrating React Hook Form with shadcn Input/Select/Textarea
    - Create `FormError` component for inline field error display
    - Create `FormSummaryError` component for unmapped server errors
    - Create `SubmitButton` component with loading state and disabled during submission
    - Implement server error mapping: parse 422 response `path[0]` to field names
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 25.6_

  - [x] 5.4 Create DataTable component (`components/tables/DataTable.tsx`)
    - Implement TanStack Table wrapper with server-side pagination (page, limit params)
    - Implement column sorting with sortBy/sortOrder params and visual indicators
    - Implement row actions (view, edit, delete, status change) with permission-based rendering
    - Implement skeleton loading state matching page limit count
    - Implement empty state with icon and message
    - Implement error state with retry action
    - Implement page size selector (10, 20, 50)
    - Implement confirmation dialog for delete actions
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5, 22.6, 22.7_

  - [x]* 5.5 Write property tests for DataTable pagination
    - **Property 12: Pagination and Sort Query Generation** — For any valid pagination params (page ≥ 1, limit ≥ 1, limit ≤ 100) and optional sort params, the generated query string contains correct page, limit, sortBy, sortOrder values.
    - **Validates: Requirements 3.5, 22.1, 22.2**

  - [x] 5.6 Create custom hooks (`hooks/`)
    - Create `hooks/usePermission.ts` with `usePermission(permission)`, `usePermissions(permissions[])`, `useHasAnyPermission(permissions[])` hooks
    - Create `hooks/useAuth.ts` with auth state selectors and actions
    - Create `hooks/useStore.ts` with store context selectors and switch logic
    - Create `hooks/usePagination.ts` with pagination state management
    - _Requirements: 15.1, 15.3, 15.5, 6.1_

  - [x]* 5.7 Write property tests for permission guard
    - **Property 3: Permission Guard Correctness** — For any permission P and permissions array A, `usePermission(P)` returns true iff P ∈ A.
    - **Validates: Requirements 15.1, 15.3**

  - [x] 5.8 Create PermissionGate component
    - Create `components/shared/PermissionGate.tsx` that renders children only when user has required permission
    - Support `fallback` prop for alternative rendering
    - Support single permission and array of permissions (any/all modes)
    - _Requirements: 15.1, 15.3_

- [x] 6. Middleware and Internationalization
  - [x] 6.1 Implement Next.js middleware (`middleware.ts`)
    - Check `refresh_token` cookie for auth state
    - Redirect unauthenticated users from `(platform)` and `(store-admin)` routes to `/login`
    - Redirect authenticated users from auth pages (`/login`, `/register`, `/forgot-password`, `/reset-password`) to `/dashboard`
    - Allow storefront routes `(storefront)/[domain]` without authentication
    - Skip `_next/static`, `_next/image`, `favicon.ico`, and `/api` routes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x]* 6.2 Write property tests for middleware route protection
    - **Property 13: Middleware Route Protection** — For any protected route, unauthenticated user redirected to /login. For any auth page, authenticated user redirected to dashboard. Storefront routes always allowed. API/static routes never redirected.
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [x] 6.3 Set up internationalization with next-intl
    - Create message files for Arabic (`messages/ar.json`) and English (`messages/en.json`)
    - Configure next-intl with default locale "ar"
    - Implement locale switching with localStorage persistence (STORAGE_KEYS.LANGUAGE)
    - Implement direction switching: ar→rtl, en→ltr with document `dir` attribute update
    - Implement fallback: missing key in selected locale falls back to other locale
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7_

  - [x]* 6.4 Write property tests for locale-direction consistency
    - **Property 11: Locale-Direction Consistency** — When locale === "ar" then direction === "rtl". When locale === "en" then direction === "ltr".
    - **Validates: Requirements 23.1, 23.2**

  - [x] 6.5 Configure theme support with next-themes
    - Set up ThemeProvider with dark, light, and system modes
    - Configure CSS variables for both themes in `globals.css`
    - Implement theme persistence in localStorage
    - Ensure no flash of incorrect theme on page load
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Authentication Pages
  - [x] 8.1 Create auth layout and login page (`app/(auth)/`)
    - Create `app/(auth)/layout.tsx` with centered card layout, logo, and language switcher
    - Create `app/(auth)/login/page.tsx` with LoginForm component
    - Implement LoginForm: identifier + password fields, Zod validation, dispatch loginThunk
    - Handle success: redirect based on system_role (PLATFORM_ADMIN/PLATFORM_OWNER → platform dashboard, USER → store-admin dashboard)
    - Handle errors: display 401 (invalid credentials), 422 (validation), 429 (rate limited) messages
    - _Requirements: 1.1, 1.7, 1.8, 1.9, 1.11, 21.1_

  - [x] 8.2 Create registration page
    - Create `app/(auth)/register/page.tsx` with RegisterForm component
    - Implement RegisterForm: name, email, phone, password fields with Zod validation
    - Handle success: store token, redirect to dashboard
    - Handle errors: display 409 (duplicate), 422 (validation) messages
    - _Requirements: 1.2, 1.10, 1.11, 21.1_

  - [x] 8.3 Create forgot-password and reset-password pages
    - Create `app/(auth)/forgot-password/page.tsx` with email input and submit
    - Create `app/(auth)/reset-password/page.tsx` with token + new_password fields
    - Implement validation and error handling for both flows
    - _Requirements: 1.1_

- [x] 9. Platform Admin Dashboard
  - [x] 9.1 Create platform admin layout with sidebar
    - Create `app/(platform)/layout.tsx` with PlatformSidebar and header
    - Create `components/layouts/PlatformSidebar.tsx` with navigation items: Dashboard, Users, Stores, Plans, Subscriptions, Permissions
    - Implement sidebar collapse/expand with localStorage persistence
    - Implement mobile responsive navigation with Sheet component
    - _Requirements: 15.2, 23.7_

  - [x] 9.2 Implement platform dashboard page
    - Create `app/(platform)/dashboard/page.tsx` displaying platform-wide statistics
    - Show total users, total stores, active stores, total subscriptions, monthly revenue
    - Fetch data via platform.thunks (getStats, getRevenue, getGrowth)
    - Display stats in card grid with loading skeletons
    - _Requirements: 5.5_

  - [x] 9.3 Implement platform users management
    - Create `app/(platform)/users/page.tsx` with DataTable for users
    - Display columns: name, email, phone, system_role, is_active, last_login_at
    - Implement search by name/email/phone and filter by system_role and is_active
    - Implement row actions: activate/deactivate, change role, delete with confirmation
    - Handle 403 for self-modification attempts
    - Implement pagination (default 20, max 100) and sorting
    - Create `app/(platform)/users/[id]/page.tsx` for user detail view
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_

  - [x] 9.4 Implement platform stores management
    - Create `app/(platform)/stores/page.tsx` with DataTable for stores
    - Display columns: name, domain, status, owner name, created_at
    - Implement search by name/domain and filter by status
    - Implement status change with valid transitions only (DRAFT→ACTIVE, ACTIVE→SUSPENDED/ARCHIVED, SUSPENDED→ACTIVE/ARCHIVED)
    - Disable invalid transition options in UI
    - Display success notification on status change
    - Create `app/(platform)/stores/[id]/page.tsx` for store detail view
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 9.5 Implement platform plans and subscriptions
    - Create `app/(platform)/plans/page.tsx` with plans list and create/edit forms
    - Implement plan creation form with Zod validation (code, name, price_monthly, etc.)
    - Handle 409 for duplicate plan code
    - Implement plan editing with PATCH (only modified fields)
    - Handle delete prevention for plans with active subscriptions
    - Create `app/(platform)/subscriptions/page.tsx` with paginated subscriptions table
    - Display: store name, plan name, status, billing cycle, period dates
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.6_

  - [x] 9.6 Implement platform permissions management
    - Create `app/(platform)/permissions/page.tsx` with permissions CRUD
    - Implement create/edit forms with code, module, action, description fields
    - _Requirements: 5.1_


- [x] 10. Store Admin — Layout and Store Selection
  - [x] 10.1 Create store admin layout with sidebar and store context
    - Create `app/(store-admin)/layout.tsx` with StoreAdminSidebar, header, and store selector
    - Create `components/layouts/StoreAdminSidebar.tsx` with permission-filtered navigation items
    - Implement store selection dropdown: fetch user's stores, dispatch setCurrentStore
    - Implement sidebar items filtered by `buildSidebarItems(permissions)`
    - Implement sidebar collapse/expand with localStorage persistence
    - Implement mobile responsive navigation
    - _Requirements: 6.1, 6.6, 6.7, 15.2, 15.5_

  - [x] 10.2 Implement store admin dashboard page
    - Create `app/(store-admin)/dashboard/page.tsx` with store-specific stats
    - Fetch overview, sales-stats, and inventory-alerts from dashboard endpoints
    - Display sales overview cards, recent orders, and low-stock alerts
    - _Requirements: 6.3_

- [x] 11. Store Admin — Product Management
  - [x] 11.1 Implement products list page
    - Create `app/(store-admin)/products/page.tsx` with DataTable
    - Display columns: name, status (badge), base_price, inventory indicator, created_at
    - Implement pagination (default 20, max 100), sorting by name/price/status/date
    - Implement filter by status and category
    - Implement row actions: edit, duplicate, change status, delete (with PermissionGate)
    - Show "Add Product" button only if user has `product:create` permission
    - _Requirements: 7.1, 15.1, 15.3, 22.1, 22.5_

  - [x] 11.2 Implement product create/edit page
    - Create `app/(store-admin)/products/new/page.tsx` with ProductForm
    - Create `app/(store-admin)/products/[id]/page.tsx` with ProductForm (edit mode)
    - Implement ProductForm with fields: name, slug (auto-gen), description, short_description, base_price, compare_at_price, cost_price, status, categories (multi-select), track_inventory
    - Implement Zod validation (name: 2-200, base_price: positive decimal max 2 decimals)
    - Handle server validation errors (422) mapped to fields
    - Implement status transitions: only allow valid transitions (DRAFT→ACTIVE, ACTIVE→ARCHIVED, ARCHIVED→DRAFT)
    - _Requirements: 7.2, 7.5, 7.6, 21.1, 21.2_

  - [x] 11.3 Implement product options, values, and variants
    - Create `app/(store-admin)/products/[id]/variants/page.tsx`
    - Implement options management: create up to 3 options, each with up to 50 values
    - Implement "Generate Variants" button to create cartesian product combinations
    - Implement variants table: title, SKU, price, is_active, inventory level
    - Implement variant edit: price, compare_at_price, SKU, barcode, is_active
    - Implement set-default variant action
    - _Requirements: 7.3_

  - [x] 11.4 Implement product media management
    - Create `app/(store-admin)/products/[id]/media/page.tsx`
    - Implement image upload: accept JPEG/PNG/WebP, max 5MB, max 20 per product
    - Send as multipart/form-data to media endpoint
    - Implement drag-to-reorder media gallery with sort_order PATCH
    - Implement alt text editing and media deletion
    - Handle upload failures with error display, preserving existing media
    - _Requirements: 7.4, 7.8_

  - [x] 11.5 Implement product duplication
    - Add duplicate action to product row actions and detail page
    - Send POST to duplicate endpoint, navigate to new product edit page on 201
    - _Requirements: 7.7_

- [x] 12. Store Admin — Category Management
  - [x] 12.1 Implement categories page with tree view
    - Create `app/(store-admin)/categories/page.tsx` with tree display
    - Use `buildCategoryTree` to transform flat API response into nested tree
    - Display tree with expand/collapse, max 3 levels deep
    - Implement drag-to-reorder with PATCH request (max 200 items)
    - Handle invalid category IDs in reorder with error display
    - _Requirements: 8.1, 8.4, 8.5, 8.6_

  - [x] 12.2 Implement category create/edit forms
    - Create category form with name, slug (auto-gen), description, parent_id (select from tree), image_url, is_active
    - Implement Zod validation (name: 1-100, parent_id references existing category)
    - Handle validation errors with field-level display
    - Implement delete with child reassignment logic
    - _Requirements: 8.2, 8.3, 8.7_

- [x] 13. Store Admin — Order Management
  - [x] 13.1 Implement orders list page
    - Create `app/(store-admin)/orders/page.tsx` with DataTable
    - Display columns: order_number, source, status (badge), payment_status, customer_name, total, created_at
    - Implement pagination, sorting, and filtering by status/payment_status/source
    - _Requirements: 9.1, 22.1_

  - [x] 13.2 Implement order detail page
    - Create `app/(store-admin)/orders/[id]/page.tsx`
    - Display: order number, source, status, payment status, line items (product, variant, SKU, qty, unit price, line total), customer info, shipping address, timeline (sorted newest first)
    - Implement status transition buttons using `getAvailableTransitions(currentStatus)`
    - Show only valid next statuses; hide buttons for terminal states (CANCELED, RETURNED)
    - Implement cancel action with confirmation
    - Implement add note (max 1000 chars) with timeline update
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6, 9.8_

  - [x] 13.3 Implement manual order creation
    - Create `app/(store-admin)/orders/new/page.tsx` with OrderForm
    - Implement line items: product/variant selection, quantity (1-9999), max 100 items
    - Implement shipping address form (full_name: 1-200, city: 1-100, street_line_1: 1-300)
    - Implement payment method selection
    - Validate inventory availability before submission
    - Handle validation errors with field-level display
    - _Requirements: 9.4, 9.7_

- [x] 14. Store Admin — Customer Management
  - [x] 14.1 Implement customers list page
    - Create `app/(store-admin)/customers/page.tsx` with DataTable
    - Display columns: name, email, phone, status (badge), total_orders, total_spent
    - Implement search by name/email/phone and filter by status (ACTIVE, BLOCKED, ARCHIVED)
    - Implement pagination (default 20, max 100)
    - _Requirements: 10.1_

  - [x] 14.2 Implement customer detail and create/edit pages
    - Create `app/(store-admin)/customers/[id]/page.tsx` with profile, order history, addresses
    - Create `app/(store-admin)/customers/new/page.tsx` with CustomerForm
    - Implement CustomerForm: first_name, last_name, email, phone, notes, status, gender, birth_date, accepts_marketing
    - Validate: at least one of email/phone required, email max 255, phone 8-20, notes max 1000
    - Handle 409 for duplicate email/phone
    - Implement address management: add, edit, delete, set default (only one default at a time)
    - _Requirements: 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 15. Store Admin — Coupon Management
  - [x] 15.1 Implement coupons list and CRUD
    - Create `app/(store-admin)/coupons/page.tsx` with DataTable
    - Create `app/(store-admin)/coupons/new/page.tsx` with CouponForm
    - Create `app/(store-admin)/coupons/[id]/page.tsx` with detail view and edit
    - Implement CouponForm: code (2-50, unique), type (PERCENTAGE/FIXED), value (1-100 for %, >0 for fixed), minimum_order_amount, maximum_discount_amount, usage_limit, usage_limit_per_customer, starts_at, ends_at, is_active
    - Validate starts_at < ends_at when both provided
    - Display usage statistics: total uses, total discount, paginated usage history
    - Implement coupon validation (POST to validate endpoint)
    - Handle delete prevention for coupons with usage records
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 16. Store Admin — Inventory Management
  - [x] 16.1 Implement inventory pages
    - Create `app/(store-admin)/inventory/page.tsx` with DataTable (max 50/page)
    - Display: product name, variant title, SKU, available_quantity, total_quantity, reserved_quantity, low_stock_threshold
    - Create `app/(store-admin)/inventory/low-stock/page.tsx` showing only variants at/below threshold
    - Create `app/(store-admin)/inventory/movements/page.tsx` with movements list (max 50/page, newest first)
    - Implement inventory adjustment dialog: type (IN/ADJUSTMENT_IN/OUT/ADJUSTMENT_OUT), quantity_change (1-99999), reason (max 500)
    - Validate OUT/ADJUSTMENT_OUT doesn't exceed available_quantity
    - Handle validation errors
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [x] 17. Store Admin — Members and Roles
  - [x] 17.1 Implement members page
    - Create `app/(store-admin)/members/page.tsx` with members list and invite form
    - Implement invite form: email (valid RFC 5322, max 254), role selection from store roles
    - Handle invite errors: user not registered, duplicate membership, invalid role
    - Implement change role action (exclude owner from role change)
    - Implement remove member with confirmation
    - Implement resend invite action
    - _Requirements: 13.1, 13.2, 13.3_

  - [x] 17.2 Implement roles page
    - Create `app/(store-admin)/roles/page.tsx` with roles list
    - Create `app/(store-admin)/roles/[id]/page.tsx` with role detail and permissions editor
    - Implement role creation: name (2-50), description (max 255), auto-generated slug
    - Implement permissions editor: checkbox grid of all available permissions, PUT with complete permission_ids array (0-200)
    - Disable editing name and prevent deletion for protected roles (is_protected: true)
    - _Requirements: 13.4, 13.5, 13.6_

- [x] 18. Store Admin — Settings
  - [x] 18.1 Implement settings pages
    - Create `app/(store-admin)/settings/page.tsx` with general settings form (name: 2-100, domain: 3-63 lowercase alphanumeric/hyphens)
    - Create `app/(store-admin)/settings/branding/page.tsx` with logo/favicon upload (max 2MB, PNG/JPG/SVG/WebP)
    - Create `app/(store-admin)/settings/seo/page.tsx` with meta_title (max 70) and meta_description (max 160)
    - Create `app/(store-admin)/settings/contact/page.tsx` with support_email, support_phone (+?[0-9]{7,15}), social links
    - Implement inline validation errors and preserve form data on failure
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

- [x] 19. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.


- [x] 20. Storefront — Layout and Store Display
  - [x] 20.1 Create storefront layout
    - Create `app/(storefront)/[domain]/layout.tsx` with StorefrontHeader and Footer
    - Create `components/layouts/StorefrontHeader.tsx` with store logo, name, navigation (categories, cart icon with count), customer account link
    - Fetch store info on layout mount, display error page for invalid/inactive domains (404/403)
    - Implement responsive mobile navigation
    - _Requirements: 16.1, 16.2_

  - [x] 20.2 Implement storefront home and category pages
    - Create `app/(storefront)/[domain]/page.tsx` with store homepage (featured products, categories)
    - Create `app/(storefront)/[domain]/categories/[slug]/page.tsx` with category products listing
    - Display category tree as hierarchical navigable links
    - Show only published and active products within selected category
    - _Requirements: 16.1, 16.6_

  - [x] 20.3 Implement storefront products listing and search
    - Create `app/(storefront)/[domain]/products/page.tsx` with product grid
    - Implement pagination (default 20, max 100)
    - Implement filters: category, price range (min 0), sort by name/price/date (default: date desc)
    - Implement debounced search (300ms) with search endpoint
    - _Requirements: 16.3, 16.4_

  - [x] 20.4 Implement storefront product detail page
    - Create `app/(storefront)/[domain]/products/[slug]/page.tsx`
    - Display: name, description, price, compare_at_price, media gallery (sorted by sort_order), variants with option values
    - Implement variant selector (option dropdowns)
    - Implement add-to-cart button: enabled only for variants with available_quantity > 0
    - Implement quantity selector
    - _Requirements: 16.5_

- [x] 21. Storefront — Cart and Checkout
  - [x] 21.1 Implement cart page
    - Create `app/(storefront)/[domain]/cart/page.tsx`
    - Display cart items: product image, name, variant, quantity selector, unit price, line total
    - Implement quantity update (0 = remove) with optimistic UI
    - Implement remove item with optimistic rollback on failure
    - Implement coupon input: apply (2-50 chars) and remove coupon
    - Display subtotal, discount, total
    - Show loading indicators on pending operations
    - Disable duplicate submissions during pending requests
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 17.7_

  - [x] 21.2 Implement checkout page
    - Create `app/(storefront)/[domain]/checkout/page.tsx`
    - Implement checkout form: customer_name (2-100), customer_phone (+218XXXXXXXXX), customer_email (optional), shipping address (full_name, city, street_line_1 required, region, street_line_2, postal_code, google_maps_url optional), payment_method selection, notes (max 1000)
    - Implement Zod validation with field-level error display
    - Support guest checkout (session cookie) and authenticated checkout (customer token)
    - On success: display order confirmation with order number, clear cart
    - Handle 422 validation errors mapped to fields
    - Handle 400 insufficient inventory with item-specific messages
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [x] 22. Storefront — Customer Account
  - [x] 22.1 Implement customer auth pages
    - Create customer register form within `app/(storefront)/[domain]/account/page.tsx`
    - Implement registration: first_name (2-100), email, phone (8-20), password (8-128)
    - Handle 409 duplicate email/phone
    - Implement login form: email + password, store customer token in memory
    - _Requirements: 19.1, 19.2, 19.3_

  - [x] 22.2 Implement customer account pages
    - Create `app/(storefront)/[domain]/account/orders/page.tsx` with order history (paginated, default 20, max 100, newest first)
    - Create `app/(storefront)/[domain]/account/addresses/page.tsx` with address management (add, edit, delete, set default)
    - Implement profile editing (first_name, last_name, email, phone)
    - _Requirements: 19.4, 19.5_

  - [x] 22.3 Implement order lookup page
    - Create `app/(storefront)/[domain]/orders/lookup/page.tsx`
    - Implement lookup form: order_number (1-50 chars) + verification_value (1-255 chars, email or phone)
    - Display matched order: order_number, status, payment_status, items, shipping address, timeline, totals
    - Handle not-found with generic error (no enumeration hints)
    - Handle 400 for missing/invalid fields
    - Handle 429 rate limit
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [x] 23. Error Handling and Global Feedback
  - [x] 23.1 Implement global error handling
    - Create network error banner component (persistent until connection restored)
    - Implement 429 rate limit handling: disable action, re-enable after Retry-After or 60s
    - Implement 409 conflict toast (visible 5+ seconds)
    - Implement 403 access denied toast (auto-dismiss 5s)
    - Implement connection restored notification with retry prompt (no auto-resubmit for mutations)
    - Integrate error handling into API client and Redux thunks
    - _Requirements: 25.1, 25.2, 25.3, 25.4, 25.5_

  - [x]* 23.2 Write property tests for validation error mapping
    - **Property 14: Validation Error Field Mapping** — For any 422 response with error array where each error has a path property, the Form_System maps path[0] to the corresponding form field.
    - **Validates: Requirement 21.2**

- [x] 24. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The implementation uses TypeScript throughout with Next.js 15 App Router
- All forms use React Hook Form + Zod for client-side validation
- All tables use TanStack Table with server-side pagination
- RTL support is built into every component from the start
- The API client handles token refresh, store context headers, and error parsing centrally

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3"] },
    { "id": 2, "tasks": ["1.4", "2.4"] },
    { "id": 3, "tasks": ["1.5", "2.1"] },
    { "id": 4, "tasks": ["2.2", "2.3"] },
    { "id": 5, "tasks": ["3.1"] },
    { "id": 6, "tasks": ["3.2", "3.4", "3.5"] },
    { "id": 7, "tasks": ["3.3", "3.6"] },
    { "id": 8, "tasks": ["5.1", "5.6"] },
    { "id": 9, "tasks": ["5.2", "5.3", "5.4", "5.7", "5.8"] },
    { "id": 10, "tasks": ["5.5", "6.1", "6.3", "6.5"] },
    { "id": 11, "tasks": ["6.2", "6.4"] },
    { "id": 12, "tasks": ["8.1", "8.2", "8.3"] },
    { "id": 13, "tasks": ["9.1", "10.1"] },
    { "id": 14, "tasks": ["9.2", "9.3", "9.4", "9.5", "9.6", "10.2"] },
    { "id": 15, "tasks": ["11.1", "12.1", "13.1", "14.1", "15.1", "16.1", "17.1", "18.1"] },
    { "id": 16, "tasks": ["11.2", "11.3", "12.2", "13.2", "13.3", "14.2", "17.2"] },
    { "id": 17, "tasks": ["11.4", "11.5"] },
    { "id": 18, "tasks": ["20.1"] },
    { "id": 19, "tasks": ["20.2", "20.3", "20.4"] },
    { "id": 20, "tasks": ["21.1", "22.1"] },
    { "id": 21, "tasks": ["21.2", "22.2", "22.3"] },
    { "id": 22, "tasks": ["23.1", "23.2"] }
  ]
}
```
